import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import { jobs, projects, type Project } from "../db/schema";
import { randomId } from "../id";
import { logger } from "../logger";
import { processJobById } from "./worker";

export type RetryJobType = "clone_and_analyze" | "analyze_local" | "reanalyze";

export type RetryPlan =
  | {
      ok: true;
      type: RetryJobType;
      payload: { url?: string; localPath?: string };
    }
  | { ok: false; error: string; status: number };

/**
 * Decide how to re-run analysis for a project.
 * Pure decision logic — no I/O. Used by the API and unit tests.
 */
export function planRetryJob(project: {
  sourceType: Project["sourceType"];
  sourceUrl: string | null;
  localPath: string | null;
  status: Project["status"];
  isDemo: boolean;
}): RetryPlan {
  if (
    project.status === "pending" ||
    project.status === "cloning" ||
    project.status === "analyzing"
  ) {
    return {
      ok: false,
      error: "Analysis already in progress for this repository",
      status: 409,
    };
  }

  if (project.status !== "failed" && project.status !== "ready") {
    return {
      ok: false,
      error: `Cannot retry project in status “${project.status}”`,
      status: 400,
    };
  }

  // GitHub: re-clone when failed (partial data cleaned) or no local path;
  // reanalyze on-disk clone when ready and path still present.
  if (project.sourceType === "github") {
    if (project.status === "ready" && project.localPath) {
      return {
        ok: true,
        type: "reanalyze",
        payload: { localPath: project.localPath },
      };
    }
    if (!project.sourceUrl) {
      return { ok: false, error: "Missing GitHub URL for retry", status: 400 };
    }
    return {
      ok: true,
      type: "clone_and_analyze",
      payload: { url: project.sourceUrl },
    };
  }

  // Local path analysis
  if (project.sourceType === "local") {
    if (!project.localPath) {
      return {
        ok: false,
        error: "No local repository path available to reanalyze",
        status: 400,
      };
    }
    return {
      ok: true,
      type: "analyze_local",
      payload: { localPath: project.localPath },
    };
  }

  // Demo: analysis is pre-seeded JSON — no clone to re-run
  if (project.sourceType === "demo" || project.isDemo) {
    return {
      ok: false,
      error: "Demo data is offline JSON — re-run pnpm seed instead of retry",
      status: 400,
    };
  }

  return {
    ok: false,
    error: "Cannot retry this project source type",
    status: 400,
  };
}

export type EnqueueRetryResult =
  | { ok: true; jobId: string; type: RetryJobType }
  | { ok: false; error: string; status: number };

/**
 * Enqueue a retry/reanalyze job and kick processing in the background.
 * Returns the new job id or a structured error.
 */
export function enqueueRetry(project: Project): EnqueueRetryResult {
  const plan = planRetryJob(project);
  if (!plan.ok) return plan;

  const db = getDb();

  // Guard concurrent active jobs for this project
  const active = db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.projectId, project.id),
        inArray(jobs.status, ["pending", "running"])
      )
    )
    .limit(1)
    .get();

  if (active) {
    return {
      ok: false,
      error: "A job is already pending or running for this repository",
      status: 409,
    };
  }

  const jobId = randomId("job");
  const now = new Date().toISOString();

  db.update(projects)
    .set({
      status: "pending",
      errorMessage: null,
      updatedAt: now,
    })
    .where(eq(projects.id, project.id))
    .run();

  db.insert(jobs)
    .values({
      id: jobId,
      projectId: project.id,
      type: plan.type,
      status: "pending",
      progress: 0,
      stage: "queued",
      payloadJson: JSON.stringify(plan.payload),
      errorMessage: null,
    })
    .run();

  void processJobById(jobId).catch((err) => {
    logger.error("Retry job processing failed", {
      jobId,
      error: String(err),
    });
  });

  return { ok: true, jobId, type: plan.type };
}
