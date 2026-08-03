import { desc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { analyses, jobs, projects, type Project } from "./db/schema";
import type { AnalysisResult } from "./types/analysis";
import { dedupeProjectsForDisplay } from "./projects/dedupe";

export function listProjects(): Project[] {
  return getDb()
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .all();
}

/** Recent list for landing / switcher — one row per logical repository. */
export function listProjectsForDisplay(limit = 8): Project[] {
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
