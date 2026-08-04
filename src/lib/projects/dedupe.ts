/**
 * Pure helpers for collapsing accidental duplicate project rows
 * (e.g. repeated `pnpm analyze` on the same path, or re-imports).
 */

export type ProjectListItem = {
  id: string;
  slug: string;
  name: string;
  fullName: string | null;
  sourceType: string;
  sourceUrl: string | null;
  localPath: string | null;
  status: string;
  isDemo: boolean;
  updatedAt: string;
};

/** Stable identity for “same repository” across rows. */
export function projectIdentityKey(p: {
  isDemo: boolean;
  slug: string;
  fullName?: string | null;
  sourceType: string;
  sourceUrl?: string | null;
  localPath?: string | null;
  name: string;
}): string {
  if (p.isDemo) return `demo:${p.slug}`;
  const full = p.fullName?.trim().toLowerCase();
  if (full) return `full:${full}`;
  if (p.sourceType === "local" && p.localPath) {
    // Normalize trailing slashes for path identity
    const path = p.localPath.replace(/\/+$/, "") || p.localPath;
    return `local:${path}`;
  }
  const url = p.sourceUrl?.trim().toLowerCase().replace(/\.git$/, "");
  if (url) return `url:${url}`;
  return `name:${p.name.trim().toLowerCase()}`;
}

/** Lower is better for display preference. */
export function projectStatusRank(status: string): number {
  switch (status) {
    case "ready":
      return 0;
    case "failed":
      return 1;
    case "analyzing":
    case "cloning":
      return 2;
    case "pending":
      return 3;
    default:
      return 4;
  }
}

/** True if `a` should replace `b` as the winner for a duplicate group. */
export function isBetterProject(
  a: { status: string; updatedAt: string },
  b: { status: string; updatedAt: string }
): boolean {
  const ra = projectStatusRank(a.status);
  const rb = projectStatusRank(b.status);
  if (ra !== rb) return ra < rb;
  return a.updatedAt > b.updatedAt;
}

/**
 * Collapse duplicates by identity key. Prefers ready over failed/in-progress,
 * then newest `updatedAt`. Preserves relative order of winners by first
 * appearance in the input (callers should pass newest-first for recency).
 */
export function dedupeProjectsForDisplay<T extends ProjectListItem>(
  projects: T[],
  limit = 8
): T[] {
  const bestByKey = new Map<string, T>();

  // A failed import is noise in a "Recent repositories" list — there is nothing
  // to open. The failure is still reported on the import screen it came from.
  // Dropped before grouping so a repository whose only row failed disappears,
  // while one that also has a ready row still shows the ready one.
  for (const p of projects.filter((p) => p.status !== "failed")) {
    const key = projectIdentityKey(p);
    const prev = bestByKey.get(key);
    if (!prev || isBetterProject(p, prev)) {
      bestByKey.set(key, p);
    }
  }

  // Prefer ready, then recency — independent of raw insert order
  const unique = [...bestByKey.values()].sort((a, b) => {
    const rank = projectStatusRank(a.status) - projectStatusRank(b.status);
    if (rank !== 0) return rank;
    return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
  });

  return unique.slice(0, limit);
}
