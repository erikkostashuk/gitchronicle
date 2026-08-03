import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { jobs, projects, type Job } from "../db/schema";
import { logger } from "../logger";

/**
 * Running jobs with no `updatedAt` heartbeat for this long are treated as
 * dead (worker crash / killed process). Progress callbacks refresh updatedAt,
 * so long analyses stay alive while work continues.
 */
export const STALE_JOB_TTL_MS = 20 * 60 * 1000; // 20 minutes

export const STALE_JOB_MESSAGE =
  "Job timed out — no progress for too long (worker may have crashed). Use Retry analysis.";

/** ISO timestamp used for heartbeat age (prefer updatedAt, then startedAt, then createdAt). */
export function jobHeartbeatIso(job: {
  updatedAt?: string | null;
  startedAt?: string | null;
  createdAt?: string | null;
}): string | null {
  return job.updatedAt || job.startedAt || job.createdAt || null;
}

export function jobHeartbeatAgeMs(
  job: {
    updatedAt?: string | null;
    startedAt?: string | null;
    createdAt?: string | null;
  },
  nowMs: number
): number {
  const iso = jobHeartbeatIso(job);
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, nowMs - t);
}

/** Pure: whether a running job has gone silent past the TTL. */
export function isJobStale(
  job: {
    status: string;
    updatedAt?: string | null;
    startedAt?: string | null;
    createdAt?: string | null;
  },
  nowMs: number = Date.now(),
  ttlMs: number = STALE_JOB_TTL_MS
): boolean {
  if (job.status !== "running") return false;
  return jobHeartbeatAgeMs(job, nowMs) > ttlMs;
}

/**
 * Mark silent `running` jobs (and their projects) as failed so the UI can
 * offer Retry. Safe to call frequently; no-ops when nothing is stale.
 */
export function recoverStaleJobs(options?: {
  nowMs?: number;
  ttlMs?: number;
}): { recoveredJobIds: string[] } {
  const nowMs = options?.nowMs ?? Date.now();
  const ttlMs = options?.ttlMs ?? STALE_JOB_TTL_MS;
  const db = getDb();
  const running = db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "running"))
    .all() as Job[];

  const recoveredJobIds: string[] = [];
  const finishedAt = new Date(nowMs).toISOString();

  for (const job of running) {
    if (!isJobStale(job, nowMs, ttlMs)) continue;

    db.update(jobs)
      .set({
        status: "failed",
        errorMessage: STALE_JOB_MESSAGE,
        stage: "timed_out",
        finishedAt,
        updatedAt: finishedAt,
      })
      .where(eq(jobs.id, job.id))
      .run();

    db.update(projects)
      .set({
        status: "failed",
        errorMessage: STALE_JOB_MESSAGE,
        updatedAt: finishedAt,
      })
      .where(eq(projects.id, job.projectId))
      .run();

    recoveredJobIds.push(job.id);
    logger.warn("Recovered stale running job", {
      jobId: job.id,
      projectId: job.projectId,
      ageMs: jobHeartbeatAgeMs(job, nowMs),
    });
  }

  return { recoveredJobIds };
}
