import type { AnalysisResult, ContributorStats } from "../types/analysis";

export type RisingStarPick = {
  contributor: ContributorStats;
  /** 0–1 how late they joined the timeline */
  lateness: number;
  /** Commits per active day */
  velocity: number;
  /** Share of all commits (0–1) */
  share: number;
  score: number;
};

/**
 * Pick a late-joining contributor with strong post-arrival impact.
 * Pure / deterministic. Uses only contributor first/last windows and
 * aggregate counts (no per-commit author histogram required).
 *
 * Eligibility (all required):
 * - ≥ 3 contributors and ≥ 20 commits overall
 * - Candidate is not the top committer
 * - firstCommit at or after 40% of the repo timeline
 * - ≥ 4 commits and ≥ 2 active days
 * - score beats a small floor (avoids tiny late blips)
 */
export function pickRisingStar(a: AnalysisResult): RisingStarPick | null {
  if (a.contributors.length < 3 || a.overview.commitCount < 20) return null;

  const t0 = new Date(a.overview.firstCommit).getTime();
  const t1 = new Date(a.overview.lastCommit).getTime();
  const span = Math.max(1, t1 - t0);
  const lateThreshold = t0 + span * 0.4;

  const total = Math.max(1, a.overview.commitCount);
  // Prefer not repeating the main-character (top committer) *unless* they
  // themselves are a late joiner — then they earned both frames.
  const lead = a.contributors[0];
  const leadIsEarly =
    lead &&
    new Date(lead.firstCommit).getTime() < lateThreshold;

  const candidates: RisingStarPick[] = [];

  for (const c of a.contributors) {
    if (leadIsEarly && lead && c.id === lead.id) continue;
    if (c.commits < 4 || c.activeDays < 2) continue;

    const start = new Date(c.firstCommit).getTime();
    if (start < lateThreshold) continue;

    const lateness = Math.min(1, Math.max(0, (start - t0) / span));
    const velocity = c.commits / Math.max(1, c.activeDays);
    const share = c.commits / total;
    // Dense short tenure after a late start — classic “rising star” shape
    const end = new Date(c.lastCommit).getTime();
    const tenureDays = Math.max(
      1,
      Math.round((end - start) / 86_400_000) + 1
    );
    const density = c.commits / tenureDays;

    // Weighted score: lateness and density dominate; volume secondary
    const score =
      lateness * 3.5 +
      density * 2.2 +
      velocity * 1.1 +
      share * 4 +
      Math.log10(c.commits + 1);

    candidates.push({ contributor: c, lateness, velocity, share, score });
  }

  if (candidates.length === 0) return null;

  candidates.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    // Stable tie-break: more commits, then name
    if (y.contributor.commits !== x.contributor.commits) {
      return y.contributor.commits - x.contributor.commits;
    }
    return x.contributor.name.localeCompare(y.contributor.name);
  });

  const best = candidates[0]!;
  // Floor: need a real late signal, not a 4-commit cameo with weak density
  if (best.score < 2.8 || best.lateness < 0.4) return null;

  return best;
}
