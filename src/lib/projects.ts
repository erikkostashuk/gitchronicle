import { desc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { analyses, jobs, projects, type Project } from "./db/schema";
import { recoverStaleJobs } from "./jobs/stale";
import type { AnalysisResult } from "./types/analysis";
import { dedupeProjectsForDisplay } from "./projects/dedupe";
import { planProjectEviction } from "./projects/retention";
import { removeRepoData } from "./git/clone";
import { getEnv } from "./env";
import { logger } from "./logger";

export function listProjects(): Project[] {
  return getDb()
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .all();
}

/** Recent list for landing / switcher — one row per logical repository. */
export function listProjectsForDisplay(limit = 8): Project[] {
  // Reap zombie jobs + orphan project statuses before listing
  recoverStaleJobs();
  return dedupeProjectsForDisplay(listProjects(), limit);
}

export function getProjectByLocalPath(localPath: string): Project | undefined {
  const normalized = localPath.replace(/\/+$/, "") || localPath;
  return getDb()
    .select()
    .from(projects)
    .where(eq(projects.localPath, normalized))
    .get();
}

export { dedupeProjectsForDisplay, projectIdentityKey } from "./projects/dedupe";
export { planProjectEviction } from "./projects/retention";

/**
 * Enforce MAX_STORED_PROJECTS, deleting each evicted project's analyses, jobs
 * and clone. Called after an import succeeds, so the store stays at its cap
 * without a scheduled sweeper.
 */
export async function enforceProjectRetention(): Promise<string[]> {
  const max = getEnv().MAX_STORED_PROJECTS;
  if (max <= 0) return [];

  const db = getDb();
  const evictIds = planProjectEviction(listProjects(), max);

  for (const id of evictIds) {
    const project = getProjectById(id);
    // Free the disk first: losing the row while the clone survives would leak
    // a directory nothing references.
    await removeRepoData(id).catch(() => {});
    db.delete(analyses).where(eq(analyses.projectId, id)).run();
    db.delete(jobs).where(eq(jobs.projectId, id)).run();
    db.delete(projects).where(eq(projects.id, id)).run();
    logger.info("Evicted project past retention limit", {
      projectId: id,
      slug: project?.slug,
      max,
    });
  }
  return evictIds;
}

export function getProjectBySlug(slug: string): Project | undefined {
  return getDb().select().from(projects).where(eq(projects.slug, slug)).get();
}

export function getProjectById(id: string): Project | undefined {
  return getDb().select().from(projects).where(eq(projects.id, id)).get();
}

export function getLatestAnalysis(
  projectId: string
): { result: AnalysisResult; id: string } | null {
  const row = getDb()
    .select()
    .from(analyses)
    .where(eq(analyses.projectId, projectId))
    .orderBy(desc(analyses.createdAt))
    .limit(1)
    .get();
  if (!row) return null;
  return {
    id: row.id,
    result: JSON.parse(row.resultJson) as AnalysisResult,
  };
}

export function getLatestJob(projectId: string) {
  return getDb()
    .select()
    .from(jobs)
    .where(eq(jobs.projectId, projectId))
    .orderBy(desc(jobs.createdAt))
    .limit(1)
    .get();
}

export function getJob(jobId: string) {
  return getDb().select().from(jobs).where(eq(jobs.id, jobId)).get();
}
