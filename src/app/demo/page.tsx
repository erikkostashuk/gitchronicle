import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { generateDemoAnalysis } from "@/lib/demo/generate";
import { randomId } from "@/lib/id";
import { persistAnalysis } from "@/lib/jobs/worker";

export const dynamic = "force-dynamic";

/**
 * Ensure demo exists, then redirect to the dashboard.
 */
export default async function DemoPage() {
  const db = getDb();
  let demo = db
    .select()
    .from(projects)
    .where(eq(projects.slug, "acme-toolkit"))
    .get();

  if (!demo || demo.status !== "ready") {
    const result = generateDemoAnalysis();
    if (!demo) {
      const id = randomId("proj");
      db.insert(projects)
        .values({
          id,
          slug: "acme-toolkit",
          name: "acme-toolkit",
          fullName: "acme/acme-toolkit",
          sourceType: "demo",
          sourceUrl: "https://github.com/acme/acme-toolkit",
          description: result.overview.narrative.slice(0, 280),
          status: "ready",
          isDemo: true,
        })
        .run();
      demo = db
        .select()
        .from(projects)
        .where(eq(projects.slug, "acme-toolkit"))
        .get()!;
    } else {
      db.update(projects)
        .set({
          status: "ready",
          isDemo: true,
          description: result.overview.narrative.slice(0, 280),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(projects.id, demo.id))
        .run();
    }
    await persistAnalysis(demo.id, result);
  }

  redirect("/repo/acme-toolkit/wrapped");
}
