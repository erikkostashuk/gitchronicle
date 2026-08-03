import fs from "node:fs/promises";
import path from "node:path";
import { getEnv, getReposDir, getTmpDir } from "../env";
import { logger } from "../logger";
import { gitExec } from "./exec";
import { validateGitHubUrl, type ValidatedGitHubUrl } from "./validate";

export interface CloneResult {
  repoPath: string;
  meta: ValidatedGitHubUrl;
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

  try {
    // Clean any prior partial
    await fs.rm(staging, { recursive: true, force: true });
    await fs.mkdir(staging, { recursive: true });

    onProgress?.(15, "Cloning repository");
    // Full clone (not blobless) so numstat/line stats are available.
    const result = await gitExec(
      ["clone", "--config", "core.askPass=", meta.cloneUrl, staging],
      {
        cwd: tmpDir,
        timeoutMs: env.CLONE_TIMEOUT_MS,
      }
    );

    if (result.code !== 0) {
      throw new Error(
        `Clone failed: ${result.stderr || result.stdout || "unknown error"}`
      );
    }
    onProgress?.(50, "Clone finished");

    // Size guard
    onProgress?.(70, "Checking size");
    const sizeBytes = await dirSize(staging);
    const maxBytes = env.MAX_CLONE_SIZE_MB * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      throw new Error(
        `Repository exceeds size limit (${env.MAX_CLONE_SIZE_MB} MB)`
      );
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
    await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
    // leave target untouched on failure if rename didn't happen
    throw err;
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
