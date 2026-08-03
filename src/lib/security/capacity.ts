/**
 * Global admission control for analysis work.
 *
 * A clone-and-analyze job spends minutes of CPU and can pull hundreds of
 * megabytes. `POST /api/projects` starts one inline, so without a cap N
 * concurrent requests means N concurrent clones — the fastest way to knock a
 * small instance over. Everything funnels through `tryAcquireAnalysisSlot`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { getEnv, getReposDir } from "../env";
import { logger } from "../logger";

let active = 0;

export interface SlotResult {
  ok: boolean;
  active: number;
  limit: number;
}

export function analysisCapacity(): { active: number; limit: number } {
  return { active, limit: getEnv().MAX_CONCURRENT_ANALYSES };
}

/** Reserve a slot. Callers MUST call `releaseAnalysisSlot` in a finally block. */
export function tryAcquireAnalysisSlot(): SlotResult {
  const limit = getEnv().MAX_CONCURRENT_ANALYSES;
  if (active >= limit) {
    return { ok: false, active, limit };
  }
  active += 1;
  return { ok: true, active, limit };
}

export function releaseAnalysisSlot() {
  active = Math.max(0, active - 1);
}

/** Test-only. */
export function resetAnalysisSlots() {
  active = 0;
}

/**
 * Total bytes under DATA_DIR/repos. Retained clones are the only unbounded
 * growth on the volume, so admission is refused before it fills — a full disk
 * takes SQLite down with it, which loses every stored analysis.
 */
export async function reposDirBytes(): Promise<number> {
  return dirSize(getReposDir());
}

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await dirSize(full);
    } else if (entry.isFile()) {
      try {
        total += (await fs.stat(full)).size;
      } catch {
        /* raced with deletion */
      }
    }
  }
  return total;
}

/** True when there is room on the volume for another clone. */
export async function hasDiskHeadroom(): Promise<boolean> {
  const budget = getEnv().MAX_TOTAL_CLONE_MB * 1024 * 1024;
  if (budget <= 0) return true;
  const used = await reposDirBytes();
  if (used >= budget) {
    logger.warn("Clone storage budget exhausted", {
      usedMb: Math.round(used / 1024 / 1024),
      budgetMb: getEnv().MAX_TOTAL_CLONE_MB,
    });
    return false;
  }
  return true;
}
