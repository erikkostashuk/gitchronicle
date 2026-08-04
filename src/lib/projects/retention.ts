/**
 * Storage retention for imported repositories.
 *
 * Imports are ephemeral: this is a demo instance, not an archive. Keeping every
 * repository anyone ever pasted grows the volume without bound and buries the
 * interesting entries under stale ones. The store behaves like a fixed-size
 * stack — the newest N survive, older ones are evicted with their analyses,
 * jobs and clones.
 */

export type RetentionCandidate = {
  id: string;
  status: string;
  isDemo: boolean;
  updatedAt: string;
};

/** Statuses that mean work is in flight; evicting these would orphan a running job. */
const ACTIVE = new Set(["pending", "cloning", "analyzing"]);

/**
 * Decide which projects to evict, newest-wins.
 *
 * Two exemptions:
 * - **The demo** is never evicted. It is re-seeded on every boot, so removing
 *   it would either come straight back or break `/demo` until the next restart.
 * - **In-flight imports** are never evicted, so a slow clone cannot be deleted
 *   out from under its own job.
 *
 * Pure: returns the ids to remove, ordered oldest first.
 */
export function planProjectEviction(
  projects: RetentionCandidate[],
  max: number
): string[] {
  if (max <= 0) return [];

  const evictable = projects.filter((p) => !p.isDemo && !ACTIVE.has(p.status));
  const protectedCount = projects.length - evictable.length;

  // Newest first, so `slice(keep)` leaves the stale tail
  const byRecency = [...evictable].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0
  );

  // Exempt rows still occupy the cap; never let that push `keep` below zero.
  const keep = Math.max(0, max - protectedCount);
  return byRecency
    .slice(keep)
    .map((p) => p.id)
    .reverse();
}
