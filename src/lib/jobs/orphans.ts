import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import { analyses, jobs, projects, type Project } from "../db/schema";
import { logger } from "../logger";

const STUCK_PROJECT_STATUSES = ["pending", "cloning", "analyzing"] as const;

export type OrphanRepair = {
  status: "ready" | "failed";
  errorMessage: string | null;
  reason:
    | "missing_job"
    | "job_completed_with_analysis"
    | "job_completed_without_analysis"
    | "job_failed";
};

/**
 * Pure: decide how to unstick a project whose status is still "in progress"
 * while the latest job is terminal or missing.
 */
export function planOrphanProjectRepair(
  project: { status: string },
  latestJob: { status: string; errorMessage?: string | null } | null,
  hasAnalysis: boolean
): OrphanRepair | null {
  if (
    !STUCK_PROJECT_STATUSES.includes(
      project.status as (typeof STUCK_PROJECT_STATUSES)[number]
    )
  ) {
    return null;
  }

  if (!latestJob) {
    return {
      status: "failed",
      errorMessage:
        "No analysis job found for this project. Use Retry analysis.",
      reason: "missing_job",
    };
  }

  if (latestJob.status === "pending" || latestJob.status === "running") {
    // Active job — leave project alone (stale job recovery handles zombies)
    return null;
  }

  if (latestJob.status === "completed") {
    if (hasAnalysis) {
      return {
        status: "ready",
        errorMessage: null,
        reason: "job_completed_with_analysis",
      };
    }
    return {
      status: "failed",
      errorMessage:
        "Job completed but no analysis was saved. Use Retry analysis.",
      reason: "job_completed_without_analysis",
    };
  }

  if (latestJob.status === "failed") {
    return {
      status: "failed",
      errorMessage:
        latestJob.errorMessage ||
        "Analysis failed. Use Retry analysis.",
      reason: "job_failed",
    };
  }

  return null;
}

/**
 * Repair projects stuck in pending/cloning/analyzing when the latest job is
 * already terminal (or missing). Safe to call frequently.
 */
export function recoverOrphanProjects(): { repairedProjectIds: string[] } {
  const db = getDb();
  const stuck = db
    .select()
    .from(projects)
    .where(inArray(projects.status, [...STUCK_PROJECT_STATUSES]))
    .all() as Project[];

  const repairedProjectIds: string[] = [];
  const now = new Date().toISOString();

  for (const project of stuck) {
    const latestJob = db
      .select()
      .from(jobs)
      .where(eq(jobs.projectId, project.id))
      .orderBy(desc(jobs.createdAt))
      .limit(1)
      .get();

    const hasAnalysis = !!db
      .select({ id: analyses.id })
      .from(analyses)
      .where(eq(analyses.projectId, project.id))
      .limit(1)
      .get();

    const repair = planOrphanProjectRepair(
      project,
      latestJob
        ? {
            status: latestJob.status,
            errorMessage: latestJob.errorMessage,
          }
        : null,
      hasAnalysis
    );
    if (!repair) continue;

    db.update(projects)
      .set({
        status: repair.status,
        errorMessage: repair.errorMessage,
        updatedAt: now,
      })
      .where(eq(projects.id, project.id))
      .run();

    repairedProjectIds.push(project.id);
    logger.warn("Repaired orphan project status", {
      projectId: project.id,
      from: project.status,
      to: repair.status,
      reason: repair.reason,
      jobId: latestJob?.id,
    });
  }

  return { repairedProjectIds };
}
