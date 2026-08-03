import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { generateDemoAnalysis } from "../src/lib/demo/generate";
import { getDb, migrateDb, closeDb } from "../src/lib/db/client";
import { analyses, projects } from "../src/lib/db/schema";
import { getDataDir } from "../src/lib/env";
import { randomId } from "../src/lib/id";
import { persistAnalysis } from "../src/lib/jobs/worker";

async function main() {
  migrateDb();
  const dataDir = getDataDir();
  fs.mkdirSync(path.join(dataDir, "demo"), { recursive: true });

  const result = generateDemoAnalysis();
  const demoPath = path.join(dataDir, "demo", "acme-toolkit.json");
  fs.writeFileSync(demoPath, JSON.stringify(result, null, 2));

  const db = getDb();
  const slug = "acme-toolkit";
  const existing = db.select().from(projects).where(eq(projects.slug, slug)).get();

  let projectId = existing?.id;
  if (!projectId) {
    projectId = randomId("proj");
    db.insert(projects)
      .values({
        id: projectId,
        slug,
        name: "acme-toolkit",
        fullName: "acme/acme-toolkit",
        sourceType: "demo",
        sourceUrl: "https://github.com/acme/acme-toolkit",
        description: result.overview.narrative.slice(0, 280),
        status: "ready",
        isDemo: true,
      })
      .run();
  } else {
    db.update(projects)
      .set({
        status: "ready",
        isDemo: true,
        description: result.overview.narrative.slice(0, 280),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, projectId))
      .run();
    db.delete(analyses).where(eq(analyses.projectId, projectId)).run();
  }

  await persistAnalysis(projectId, result);
  console.log(`Seeded demo project "${slug}" (${projectId})`);
  console.log(`Wrote ${demoPath}`);
  console.log(
    `Commits=${result.overview.commitCount} contributors=${result.overview.contributorCount} files=${result.overview.fileCount}`
  );
  closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
