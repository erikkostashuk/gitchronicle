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
  if (!fs.existsSync(repoPath)) {
    console.error(`Path does not exist: ${repoPath}`);
    process.exit(1);
  }
  if (!(await isGitRepo(repoPath))) {
    console.error(`Not a git repository: ${repoPath}`);
    process.exit(1);
  }

  migrateDb();
  const db = getDb();
  const name = path.basename(repoPath);
  const slugBase = slugify(name) || "local-repo";
  let slug = slugBase;
  let n = 1;
  while (db.select().from(projects).where(eq(projects.slug, slug)).get()) {
    slug = `${slugBase}-${n++}`;
  }

  const projectId = randomId("proj");
  const jobId = randomId("job");

  db.insert(projects)
    .values({
      id: projectId,
      slug,
      name,
      sourceType: "local",
      localPath: repoPath,
      status: "analyzing",
      isDemo: false,
    })
    .run();

  db.insert(jobs)
    .values({
      id: jobId,
      projectId,
      type: "analyze_local",
      status: "running",
      progress: 5,
      stage: "analyzing",
      payloadJson: JSON.stringify({ localPath: repoPath }),
      startedAt: new Date().toISOString(),
    })
    .run();

  console.log(`Analyzing ${repoPath} → project ${slug}`);

  try {
    const result = await runAnalysis({
      repoPath,
      name,
      onProgress: (p, stage) => {
        process.stdout.write(`\r[${p.toString().padStart(3)}%] ${stage}          `);
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
