import { eq } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { runAnalysis } from "../analysis/run";
import { getDb } from "../db/client";
import { analyses, jobs, projects } from "../db/schema";
import { getEnv, getReposDir } from "../env";
import { cloneGitHubRepo, removeRepoData } from "../git/clone";
import {
  releaseAnalysisSlot,
  tryAcquireAnalysisSlot,
} from "../security/capacity";
import { logger } from "../logger";
import { toUserMessage } from "../errors";
import { enforceProjectRetention } from "../projects";
import type { AnalysisResult } from "../types/analysis";
import { randomId } from "../id";
import { recoverStaleJobs } from "./stale";

export async function processNextJob(): Promise<boolean> {
  // Free jobs stuck after a crashed worker before claiming new work
  recoverStaleJobs();

  const db = getDb();
  const pending = db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "pending"))
    .limit(1)
    .all();

  const job = pending[0];
  if (!job) return false;

  const now = new Date().toISOString();
  db.update(jobs)
    .set({
      status: "running",
      startedAt: now,
      updatedAt: now,
      stage: "starting",
      progress: 1,
    })
    .where(eq(jobs.id, job.id))
    .run();

  try {
    await runJob(job.id);
    return true;
  } catch (err) {
    const message = toUserMessage(err, { jobId: job.id });
    db.update(jobs)
      .set({
        status: "failed",
        errorMessage: message,
        stage: "failed",
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, job.id))
      .run();
    db.update(projects)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, job.projectId))
      .run();
    return true;
  }
}

async function updateJob(
  jobId: string,
  progress: number,
  stage: string
) {
  getDb()
    .update(jobs)
    .set({
      progress,
      stage,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(jobs.id, jobId))
    .run();
}

async function runJob(jobId: string) {
  // Admission control lives here rather than only at the HTTP route so every
  // entry point (inline route, worker loop, retry, CLI) shares one ceiling.
  const slot = tryAcquireAnalysisSlot();
  if (!slot.ok) {
    throw new Error(
      `Analysis capacity reached (${slot.active}/${slot.limit} running). Try again shortly.`
    );
  }
  try {
    await runJobInner(jobId);
  } finally {
    releaseAnalysisSlot();
  }
}

async function runJobInner(jobId: string) {
  const db = getDb();
  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).get();
  if (!job) throw new Error("Job not found");

  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, job.projectId))
    .get();
  if (!project) throw new Error("Project not found");

  let repoPath: string | null = project.localPath;
  const payload = job.payloadJson
    ? (JSON.parse(job.payloadJson) as { url?: string; localPath?: string })
    : {};

  if (job.type === "clone_and_analyze") {
    const url = payload.url ?? project.sourceUrl;
    if (!url) throw new Error("Missing GitHub URL");
    db.update(projects)
      .set({ status: "cloning", updatedAt: new Date().toISOString() })
      .where(eq(projects.id, project.id))
      .run();

    const { repoPath: cloned, meta } = await cloneGitHubRepo(
      url,
      project.id,
      (p, stage) => {
        void updateJob(jobId, Math.min(50, Math.round(p * 0.5)), stage);
      }
    );
    repoPath = cloned;
    db.update(projects)
      .set({
        fullName: meta.fullName,
        sourceUrl: meta.url,
        name: meta.repo,
        localPath: repoPath,
        status: "analyzing",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, project.id))
      .run();
  } else {
    if (payload.localPath) repoPath = payload.localPath;
    if (!repoPath) {
      const fallback = path.join(getReposDir(), project.id);
      try {
        await fs.access(fallback);
        repoPath = fallback;
      } catch {
        throw new Error("No local repository path available");
      }
    }
    db.update(projects)
      .set({ status: "analyzing", updatedAt: new Date().toISOString() })
      .where(eq(projects.id, project.id))
      .run();
  }

  if (!repoPath) throw new Error("Repository path missing");

  const result = await runAnalysis({
    repoPath,
    name: project.name,
    fullName: project.fullName ?? undefined,
    url: project.sourceUrl ?? undefined,
    onProgress: (p, stage) => {
      const mapped = 50 + Math.round(p * 0.5);
      void updateJob(jobId, mapped, stage);
    },
  });

  await persistAnalysis(project.id, result);

  // The analysis result is self-contained, so a cloned repo is dead weight once
  // it is persisted. Retaining every clone is the only unbounded growth on the
  // volume — and a full volume takes SQLite (and every stored analysis) with it.
  const clonedFromGitHub = job.type === "clone_and_analyze";
  const dropClone = clonedFromGitHub && !getEnv().KEEP_CLONES;
  if (dropClone) {
    try {
      await removeRepoData(project.id);
      logger.info("Removed clone after analysis", { projectId: project.id });
    } catch (err) {
      logger.warn("Could not remove clone", {
        projectId: project.id,
        error: String(err),
      });
    }
  }

  db.update(projects)
    .set({
      status: "ready",
      errorMessage: null,
      // Clearing localPath keeps retry honest: it must re-clone, not read a
      // directory that is no longer there.
      localPath: dropClone ? null : project.localPath,
      description: result.overview.narrative.slice(0, 280),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, project.id))
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

  logger.info("Job completed", { jobId, projectId: project.id });

  // A new repository just landed, so the store may now exceed its cap. Pruning
  // here rather than on a schedule keeps the volume bounded without a sweeper.
  // Never fatal: the analysis is already saved and the user is waiting on it.
  try {
    const evicted = await enforceProjectRetention();
    if (evicted.length) {
      logger.info("Retention evicted older projects", {
        count: evicted.length,
      });
    }
  } catch (err) {
    logger.warn("Retention pass failed", { error: String(err) });
  }
}

export async function persistAnalysis(
  projectId: string,
  result: AnalysisResult
) {
  const db = getDb();
  const summary = {
    name: result.repository.name,
    commitCount: result.overview.commitCount,
    contributorCount: result.overview.contributorCount,
    fileCount: result.overview.fileCount,
    ageDays: result.overview.ageDays,
    languages: result.languages.slice(0, 5),
    narrative: result.overview.narrative,
  };

  // Replace prior analyses for project
  db.delete(analyses).where(eq(analyses.projectId, projectId)).run();

  db.insert(analyses)
    .values({
      id: randomId("an"),
      projectId,
      version: 1,
      summaryJson: JSON.stringify(summary),
      resultJson: JSON.stringify(result),
      commitCount: result.overview.commitCount,
      contributorCount: result.overview.contributorCount,
      fileCount: result.overview.fileCount,
    })
    .run();
}

export async function processJobById(jobId: string): Promise<void> {
  recoverStaleJobs();

  const db = getDb();
  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).get();
  if (!job) throw new Error("Job not found");
  if (job.status === "completed") return;
  // Stale recovery may have just failed this id; do not resurrect it
  if (job.status === "failed") {
    throw new Error(job.errorMessage || "Job already failed");
  }

  db.update(jobs)
    .set({
      status: "running",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 1,
      stage: "starting",
    })
    .where(eq(jobs.id, jobId))
    .run();

  try {
    await runJob(jobId);
  } catch (err) {
    const message = toUserMessage(err, { jobId });
    db.update(jobs)
      .set({
        status: "failed",
        errorMessage: message,
        stage: "failed",
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId))
      .run();
    db.update(projects)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, job.projectId))
      .run();
    // Cleanup partial clone
    try {
      await removeRepoData(job.projectId);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

export async function workerLoop(intervalMs = 1500) {
  logger.info("Worker started");
  recoverStaleJobs();
  for (;;) {
    try {
      const worked = await processNextJob();
      if (!worked) {
        // Idle tick still reaps zombies left by a previous process
        recoverStaleJobs();
        await sleep(intervalMs);
      }
    } catch (err) {
      logger.error("Worker loop error", { error: String(err) });
      await sleep(intervalMs);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
