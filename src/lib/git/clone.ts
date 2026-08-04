import fs from "node:fs/promises";
import path from "node:path";
import { getEnv, getReposDir, getTmpDir } from "../env";
import { logger } from "../logger";
import { UserFacingError, tooLargeError } from "../errors";
import { gitExec } from "./exec";
import { validateGitHubUrl, type ValidatedGitHubUrl } from "./validate";

export interface CloneResult {
  repoPath: string;
  meta: ValidatedGitHubUrl;
}

/** How often the watchdog measures the growing clone. */
const SIZE_POLL_MS = 2_000;

/**
 * Ask GitHub how big the repository is before cloning anything.
 *
 * `size` is the repository's size in KB. This is the cheap guard: a 6 GB
 * repository is refused in one HTTP call instead of filling the volume first.
 * Fails *open* — if the API is unreachable or rate-limited we fall through to
 * the watchdog, which enforces the same ceiling the expensive way.
 */
async function preflightSize(
  meta: ValidatedGitHubUrl,
  limitMb: number
): Promise<void> {
  let payload: { size?: number; message?: string };
  try {
    const res = await fetch(
      `https://api.github.com/repos/${meta.owner}/${meta.repo}`,
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "gitchronicle",
        },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (res.status === 404) {
      throw new UserFacingError(
        "That repository could not be found. Check the URL, and note that only public repositories can be imported."
      );
    }
    if (!res.ok) return; // rate limited or transient — let the watchdog handle it
    payload = (await res.json()) as { size?: number };
  } catch (err) {
    if (err instanceof UserFacingError) throw err;
    logger.warn("Repository size preflight failed; relying on watchdog", {
      fullName: meta.fullName,
      error: String(err),
    });
    return;
  }

  const sizeMb = Math.round((payload.size ?? 0) / 1024);
  if (sizeMb > limitMb) {
    logger.info("Refused oversized repository before clone", {
      fullName: meta.fullName,
      sizeMb,
      limitMb,
    });
    throw tooLargeError(limitMb);
  }
}

/**
 * Clone a public GitHub repo into DATA_DIR/repos/<projectId>.
 * Uses argument-array spawn only.
 */
export async function cloneGitHubRepo(
  inputUrl: string,
  projectId: string,
  onProgress?: (percent: number, stage: string) => void
): Promise<CloneResult> {
  const meta = validateGitHubUrl(inputUrl);
  const env = getEnv();
  const reposDir = getReposDir();
  const tmpDir = getTmpDir();
  await fs.mkdir(reposDir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });

  const target = path.join(reposDir, projectId);
  const staging = path.join(tmpDir, `clone-${projectId}-${Date.now()}`);

  onProgress?.(5, "Validating URL");

  const maxBytes = env.MAX_CLONE_SIZE_MB * 1024 * 1024;

  // Cheap guard first: refuse an oversized repository without touching the disk.
  await preflightSize(meta, env.MAX_CLONE_SIZE_MB);

  let watchdog: NodeJS.Timeout | undefined;

  try {
    // Clean any prior partial
    await fs.rm(staging, { recursive: true, force: true });
    await fs.mkdir(staging, { recursive: true });

    onProgress?.(15, "Cloning repository");

    /*
     * Expensive guard: measuring only after `git clone` returns cannot stop a
     * repository bigger than the volume — the clone fills the disk and fails
     * with ENOSPC first, taking the whole instance's free space with it. Watch
     * the staging directory grow and kill git the moment it crosses the limit.
     */
    const controller = new AbortController();
    watchdog = setInterval(() => {
      void dirSize(staging)
        .then((bytes) => {
          if (bytes > maxBytes) {
            logger.warn("Aborting clone that exceeded the size limit", {
              projectId,
              fullName: meta.fullName,
              bytes,
              maxBytes,
            });
            controller.abort(tooLargeError(env.MAX_CLONE_SIZE_MB));
          }
        })
        .catch(() => {
          /* directory vanished or is mid-write; next tick will retry */
        });
    }, SIZE_POLL_MS);

    // Full clone (not blobless) so numstat/line stats are available.
    const result = await gitExec(
      ["clone", "--config", "core.askPass=", meta.cloneUrl, staging],
      {
        cwd: tmpDir,
        timeoutMs: env.CLONE_TIMEOUT_MS,
        signal: controller.signal,
      }
    );

    clearInterval(watchdog);
    watchdog = undefined;

    if (result.code !== 0) {
      // stderr carries absolute staging paths, so it is logged, never thrown
      logger.error("Clone failed", {
        projectId,
        fullName: meta.fullName,
        stderr: result.stderr || result.stdout,
      });
      throw new Error(result.stderr || result.stdout || "clone failed");
    }
    onProgress?.(50, "Clone finished");

    // Final check: the watchdog polls, so a burst between ticks can still land over.
    onProgress?.(70, "Checking size");
    const sizeBytes = await dirSize(staging);
    if (sizeBytes > maxBytes) {
      throw tooLargeError(env.MAX_CLONE_SIZE_MB);
    }

    await fs.rm(target, { recursive: true, force: true });
    await fs.rename(staging, target);
    onProgress?.(90, "Clone complete");
    logger.info("Cloned repository", {
      projectId,
      fullName: meta.fullName,
      sizeBytes,
    });
    return { repoPath: target, meta };
  } catch (err) {
    // Reclaim the disk before rethrowing: a partial clone of a huge repository
    // is exactly the state that leaves the volume full for the next request.
    await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
    // leave target untouched on failure if rename didn't happen
    throw err;
  } finally {
    if (watchdog) clearInterval(watchdog);
  }
}

async function dirSize(root: string): Promise<number> {
  let total = 0;
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile()) {
        const st = await fs.stat(p);
        total += st.size;
      }
    }
  }
  await walk(root);
  return total;
}

export async function removeRepoData(projectId: string): Promise<void> {
  const target = path.join(getReposDir(), projectId);
  await fs.rm(target, { recursive: true, force: true });
}
