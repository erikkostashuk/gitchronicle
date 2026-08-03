import { NextResponse } from "next/server";
import { enqueueRetry } from "@/lib/jobs/retry";
import { getProjectBySlug } from "@/lib/projects";
import { getEnv } from "@/lib/env";
import {
  clientKey,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { analysisCapacity } from "@/lib/security/capacity";

export const dynamic = "force-dynamic";

/**
 * POST /api/repos/[slug]/retry
 * Re-queue analysis for a failed (or ready) non-demo project.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const project = getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Retry re-clones and re-analyses, so it costs the same as an import. Metered
  // only once the request is known to be actionable — a 404 does no work.
  const env = getEnv();
  const limit = rateLimit(
    `retry:${clientKey(req)}`,
    env.IMPORT_RATE_LIMIT,
    env.IMPORT_RATE_WINDOW_MS
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many retries. Try again in ${limit.retryAfter}s.` },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  const capacity = analysisCapacity();
  if (capacity.active >= capacity.limit) {
    return NextResponse.json(
      { error: "Another repository is being analyzed right now." },
      { status: 503, headers: { "Retry-After": "60" } }
    );
  }

  const result = enqueueRetry(project);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    projectId: project.id,
    slug: project.slug,
    jobId: result.jobId,
    type: result.type,
    status: "pending",
  });
}
