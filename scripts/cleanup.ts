import fs from "node:fs/promises";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { getDb, migrateDb, closeDb } from "../src/lib/db/client";
import { analyses, jobs, projects } from "../src/lib/db/schema";
import { getReposDir, getTmpDir } from "../src/lib/env";

async function main() {
  migrateDb();
  const db = getDb();
  const args = process.argv.slice(2);
  const failedOnly = args.includes("--failed");
  const allClones = args.includes("--clones");

  // Clean tmp
  const tmp = getTmpDir();
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.mkdir(tmp, { recursive: true });
  console.log("Cleared tmp directory");

  if (allClones) {
    const repos = getReposDir();
    await fs.rm(repos, { recursive: true, force: true });
    await fs.mkdir(repos, { recursive: true });
    console.log("Cleared all cloned repositories");
  }

  if (failedOnly || args.includes("--purge-failed")) {
    const failed = db
      .select()
      .from(projects)
      .where(eq(projects.status, "failed"))
      .all();
    for (const p of failed) {
      const repoPath = path.join(getReposDir(), p.id);
      await fs.rm(repoPath, { recursive: true, force: true });
      db.delete(jobs).where(eq(jobs.projectId, p.id)).run();
      db.delete(analyses).where(eq(analyses.projectId, p.id)).run();
      db.delete(projects).where(eq(projects.id, p.id)).run();
      console.log(`Removed failed project ${p.slug}`);
    }
  }

  // Orphan job cleanup
  const stale = db
    .select()
    .from(jobs)
    .where(inArray(jobs.status, ["pending", "running"]))
    .all()
    .filter((j) => {
      const age =
        Date.now() - new Date(j.updatedAt ?? j.createdAt).getTime();
      return age > 24 * 60 * 60 * 1000;
    });
  for (const j of stale) {
    db.update(jobs)
      .set({
        status: "failed",
        errorMessage: "Stale job cleaned up",
        stage: "failed",
        finishedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, j.id))
      .run();
    console.log(`Marked stale job ${j.id} as failed`);
  }

  closeDb();
  console.log("Cleanup complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
