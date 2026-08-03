import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { jobs, projects } from "@/lib/db/schema";
import { validateGitHubUrl } from "@/lib/git/validate";
import { randomId } from "@/lib/id";
import { processJobById } from "@/lib/jobs/worker";
import { listProjects } from "@/lib/projects";
import { slugify } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/env";
import {
  clientKey,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { analysisCapacity, hasDiskHeadroom } from "@/lib/security/capacity";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = listProjects();
  return NextResponse.json({
    projects: rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      fullName: p.fullName,
      sourceType: p.sourceType,
      sourceUrl: p.sourceUrl,
      status: p.status,
      isDemo: p.isDemo,
      description: p.description,
      errorMessage: p.errorMessage,
      updatedAt: p.updatedAt,
    })),
  });
}

const importSchema = z.object({
  url: z.string().min(1).max(300),
});

export async function POST(req: Request) {
  const env = getEnv();
  try {
    const body = importSchema.parse(await req.json());
    // Validate before metering: a rejected URL performs no clone and no
    // analysis, so charging quota for it only ever locks out honest users.
    const meta = validateGitHubUrl(body.url);
    const db = getDb();

    const existing = db
      .select()
      .from(projects)
      .where(eq(projects.fullName, meta.fullName))
      .get();

    // Serving an already-analysed repo costs nothing — no quota, no capacity check
    if (existing && existing.status === "ready") {
      return NextResponse.json({
        projectId: existing.id,
        slug: existing.slug,
        jobId: null,
        status: existing.status,
        reused: true,
      });
    }

    // This request will clone and analyse, so now it costs quota
    const limit = rateLimit(
      `import:${clientKey(req)}`,
      env.IMPORT_RATE_LIMIT,
      env.IMPORT_RATE_WINDOW_MS
    );
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many imports. Try again in ${limit.retryAfter}s.` },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    // Refuse new work when the box or the volume is already saturated
    const capacity = analysisCapacity();
    if (capacity.active >= capacity.limit) {
      return NextResponse.json(
        {
          error:
            "Another repository is being analyzed right now. Try again shortly.",
        },
        { status: 503, headers: { "Retry-After": "60" } }
      );
    }
    if (!(await hasDiskHeadroom())) {
      return NextResponse.json(
        {
          error:
            "This instance is at its storage limit and cannot take new repositories right now.",
        },
        { status: 503, headers: { "Retry-After": "3600" } }
      );
    }

    let projectId = existing?.id;
    let slug = existing?.slug;

    if (!projectId) {
      projectId = randomId("proj");
      const base = slugify(meta.repo) || "repo";
      slug = base;
      let n = 1;
      while (db.select().from(projects).where(eq(projects.slug, slug)).get()) {
        slug = `${base}-${n++}`;
      }
      db.insert(projects)
        .values({
          id: projectId,
          slug,
          name: meta.repo,
          fullName: meta.fullName,
          sourceType: "github",
          sourceUrl: meta.url,
          status: "pending",
          isDemo: false,
        })
        .run();
    } else {
      db.update(projects)
        .set({
          status: "pending",
          errorMessage: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(projects.id, projectId))
        .run();
    }

    const jobId = randomId("job");
    db.insert(jobs)
      .values({
        id: jobId,
        projectId: projectId!,
        type: "clone_and_analyze",
        status: "pending",
        progress: 0,
        stage: "queued",
        payloadJson: JSON.stringify({ url: meta.url }),
      })
      .run();

    // Kick off in background so the request returns quickly
    void processJobById(jobId).catch((err) => {
      logger.error("Inline job processing failed", {
        jobId,
        error: String(err),
      });
    });

    return NextResponse.json(
      {
        projectId,
        slug,
        jobId,
        status: "pending",
        reused: false,
      },
      { headers: rateLimitHeaders(limit) }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    const isValidation =
      message.includes("Only public HTTPS") || message.includes("Invalid");
    if (isValidation) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    // Never echo internal errors to a public client — they leak paths and
    // dependency internals. Log the detail, return a generic message.
    logger.error("Import failed", { error: message });
    return NextResponse.json(
      { error: "Import failed. Please try again." },
      { status: 500 }
    );
  }
}
