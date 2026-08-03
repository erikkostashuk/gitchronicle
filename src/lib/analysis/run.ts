import { getEnv } from "../env";
import { gitOk, isGitRepo } from "../git/exec";
import {
  GIT_LOG_FORMAT,
  parseLogWithNumstat,
  parseTags,
} from "../git/parse";
import { logger } from "../logger";
import type { AnalysisResult, CommitWithFiles, TagInfo } from "../types/analysis";
import { analyzeRepository } from "./metrics";

export interface RunAnalysisOptions {
  repoPath: string;
  name: string;
  fullName?: string;
  url?: string;
  onProgress?: (percent: number, stage: string) => void;
}

export async function collectCommits(
  repoPath: string,
  maxCommits: number
): Promise<CommitWithFiles[]> {
  const format = `%x1e${GIT_LOG_FORMAT}`;
  const stdout = await gitOk(
    [
      "log",
      "--all",
      `--max-count=${maxCommits}`,
      "--numstat",
      "--find-renames",
      `--pretty=format:${format}`,
      "--date=iso-strict",
    ],
    { cwd: repoPath, timeoutMs: getEnv().ANALYZE_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 }
  );
  return parseLogWithNumstat(stdout);
}

export async function collectTags(repoPath: string): Promise<TagInfo[]> {
  try {
    const stdout = await gitOk(
      [
        "for-each-ref",
        "--sort=creatordate",
        "--format=%(refname:short)|%(objectname)|%(creatordate:iso-strict)|%(subject)",
        "refs/tags",
      ],
      { cwd: repoPath, timeoutMs: 60_000 }
    );
    return parseTags(stdout);
  } catch (err) {
    logger.warn("Failed to collect tags", { error: String(err) });
    return [];
  }
}

export async function detectDefaultBranch(
  repoPath: string
): Promise<string | undefined> {
  try {
    const sym = await gitOk(["symbolic-ref", "refs/remotes/origin/HEAD"], {
      cwd: repoPath,
      timeoutMs: 10_000,
    });
    const m = sym.trim().match(/refs\/remotes\/origin\/(.+)/);
    if (m) return m[1];
  } catch {
    /* fall through */
  }
  try {
    const b = await gitOk(["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: repoPath,
      timeoutMs: 10_000,
    });
    return b.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function runAnalysis(
  options: RunAnalysisOptions
): Promise<AnalysisResult> {
  const { repoPath, name, fullName, url, onProgress } = options;
  const env = getEnv();

  onProgress?.(5, "Validating repository");
  const ok = await isGitRepo(repoPath);
  if (!ok) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }

  onProgress?.(15, "Reading commit history");
  const commits = await collectCommits(repoPath, env.MAX_COMMITS);
  if (commits.length === 0) {
    throw new Error("Repository has no commits to analyze");
  }

  onProgress?.(45, "Reading tags");
  const tags = await collectTags(repoPath);

  onProgress?.(55, "Detecting default branch");
  const defaultBranch = await detectDefaultBranch(repoPath);

  onProgress?.(65, "Computing metrics");
  const result = analyzeRepository({
    commits,
    tags,
    repository: {
      name,
      fullName,
      url,
      defaultBranch,
    },
    limits: {
      maxGraphNodes: env.MAX_GRAPH_NODES,
      maxGraphEdges: env.MAX_GRAPH_EDGES,
      maxTimelineSamples: env.MAX_TIMELINE_SAMPLES,
    },
  });

  onProgress?.(100, "Complete");
  return result;
}
