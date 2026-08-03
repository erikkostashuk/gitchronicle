import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { runAnalysis } from "../src/lib/analysis/run";
import { getDb, migrateDb, closeDb } from "../src/lib/db/client";
import { jobs, projects } from "../src/lib/db/schema";
import { isGitRepo } from "../src/lib/git/exec";
import { assertSafeLocalPath } from "../src/lib/git/validate";
import { randomId } from "../src/lib/id";
import { persistAnalysis } from "../src/lib/jobs/worker";
import { slugify } from "../src/lib/utils";

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const repoPathArg = args[0];
  if (!repoPathArg) {
    console.error("Usage: pnpm analyze -- /path/to/repository");
    process.exit(1);
  }

  const repoPath = path.resolve(assertSafeLocalPath(repoPathArg));
  // Stable identity: no trailing slash (matches projectIdentityKey)
  const normalizedPath = repoPath.replace(/\/+$/, "") || repoPath;

  if (!fs.existsSync(normalizedPath)) {
    console.error(`Path does not exist: ${normalizedPath}`);
    process.exit(1);
  }
  if (!(await isGitRepo(normalizedPath))) {
    console.error(`Not a git repository: ${normalizedPath}`);
    process.exit(1);
  }

  migrateDb();
  const db = getDb();
  const name = path.basename(normalizedPath);

  // Reuse existing row for this path so landing / switcher do not pile up clones
  const existing =
    db
      .select()
      .from(projects)
      .where(eq(projects.localPath, normalizedPath))
      .get() ??
    // legacy rows may lack localPath or have trailing slash
    db
      .select()
      .from(projects)
      .all()
      .find(
        (p) =>
          p.sourceType === "local" &&
          p.localPath &&
          p.localPath.replace(/\/+$/, "") === normalizedPath
      );

  let projectId: string;
  let slug: string;
  const now = new Date().toISOString();

  if (existing) {
    projectId = existing.id;
    slug = existing.slug;
    db.update(projects)
      .set({
        localPath: normalizedPath,
        name: existing.name || name,
        status: "analyzing",
        errorMessage: null,
        updatedAt: now,
      })
      .where(eq(projects.id, projectId))
      .run();
    console.log(`Re-analyzing ${normalizedPath} → existing project ${slug}`);
  } else {
    projectId = randomId("proj");
    const slugBase = slugify(name) || "local-repo";
    slug = slugBase;
    let n = 1;
    while (db.select().from(projects).where(eq(projects.slug, slug)).get()) {
      slug = `${slugBase}-${n++}`;
    }
    db.insert(projects)
      .values({
        id: projectId,
        slug,
        name,
        sourceType: "local",
        localPath: normalizedPath,
        status: "analyzing",
        isDemo: false,
      })
      .run();
    console.log(`Analyzing ${normalizedPath} → project ${slug}`);
  }

  const jobId = randomId("job");
  db.insert(jobs)
    .values({
      id: jobId,
      projectId,
      type: "analyze_local",
      status: "running",
      progress: 5,
      stage: "analyzing",
      payloadJson: JSON.stringify({ localPath: normalizedPath }),
      startedAt: now,
    })
    .run();

  try {
    const result = await runAnalysis({
      repoPath: normalizedPath,
      name,
      onProgress: (p, stage) => {
        process.stdout.write(
          `\r[${p.toString().padStart(3)}%] ${stage}          `
        );
        db.update(jobs)
          .set({
            progress: p,
            stage,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(jobs.id, jobId))
          .run();
      },
    });
    process.stdout.write("\n");
    await persistAnalysis(projectId, result);
    db.update(projects)
      .set({
        status: "ready",
        localPath: normalizedPath,
        description: result.overview.narrative.slice(0, 280),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, projectId))
      .run();
    db.update(jobs)
      .set({
        status: "completed",
        progress: 100,
        stage: "complete",
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId))
      .run();
    console.log(
      `Done. Open /repo/${slug}/wrapped — commits=${result.overview.commitCount}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.update(projects)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, projectId))
      .run();
    db.update(jobs)
      .set({
        status: "failed",
        errorMessage: message,
        stage: "failed",
        finishedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId))
      .run();
    console.error("\nAnalysis failed:", message);
    process.exit(1);
  } finally {
    closeDb();
  }
}

main();
