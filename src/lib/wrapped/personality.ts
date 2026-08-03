import type { AnalysisResult } from "../types/analysis";
import type { RepositoryPersonality, StreakInfo } from "./types";

/**
 * Deterministic repository personality from real metrics.
 *
 * Evaluation order (first match wins after baseline scoring):
 * 1. Phoenix — long quiet ≥30d then later activity (quiet + post-gap commits)
 * 2. Night Owl — peak hour in 22–05 UTC
 * 3. Weekend Builder — weekend share ≥ 35% of commits
 * 4. Relentless Refactorer — refactor category ≥ 25% of categorized commits
 * 5. Feature Factory — feature category ≥ 40%
 * 6. Steady Ship — activeDays / ageDays ≥ 0.55 and age ≥ 60
 * 7. Carefully Curated Monolith — fileCount ≥ 80 and contributorCount ≤ 3
 * 8. Fast-Moving Experiment — ageDays ≤ 45 and commits ≥ 40
 * 9. Default — The Steady Ship if activity dense, else The Fast-Moving Experiment
 *    for tiny repos, else a generic label based on top category.
 */
export function computePersonality(
  analysis: AnalysisResult,
  streaks: StreakInfo
): RepositoryPersonality {
  const { overview, activity, categories, contributors, files } = analysis;
  const hours = activity.hourHistogram;
  const weekdays = activity.weekdayHistogram;
  const totalHour = hours.reduce((s, n) => s + n, 0) || 1;
  const totalWd = weekdays.reduce((s, n) => s + n, 0) || 1;

  const peakHour = hours.indexOf(Math.max(...hours));
  const nightOwl =
    totalHour > 0 &&
    (peakHour >= 22 || peakHour <= 5) &&
    (hours[peakHour]! / totalHour) >= 0.08;

  const weekend = weekdays[0]! + weekdays[6]!;
  const weekendShare = weekend / totalWd;

  const catTotal = categories.reduce((s, c) => s + c.count, 0) || 1;
  const catShare = (name: string) =>
    (categories.find((c) => c.category === name)?.count ?? 0) / catTotal;

  const density =
    overview.ageDays > 0 ? overview.activeDays / overview.ageDays : 0;

  const reasons: string[] = [];

  // Phoenix
  if (
    streaks.longestQuietDays >= 30 &&
    overview.commitCount >= 10 &&
    overview.activeDays >= 5
  ) {
    reasons.push(
      `Longest quiet spell of ${streaks.longestQuietDays} days with continued work afterward`
    );
    return {
      id: "phoenix",
      label: "The Phoenix",
      blurb: "Went quiet, then came back hotter. History has chapters.",
      reasons,
    };
  }

  if (nightOwl && overview.commitCount >= 5) {
    reasons.push(`Peak commit hour ${peakHour}:00 UTC (night window)`);
    return {
      id: "night_owl",
      label: "The Night Owl",
      blurb: "This codebase thrives after dark — history is written in late hours.",
      reasons,
    };
  }

  if (weekendShare >= 0.35 && overview.commitCount >= 8) {
    reasons.push(
      `${Math.round(weekendShare * 100)}% of commits land on Saturday or Sunday`
    );
    return {
      id: "weekend_builder",
      label: "The Weekend Builder",
      blurb: "Saturday energy, shipped midweek. Side-project soul, production spine.",
      reasons,
    };
  }

  if (catShare("refactor") >= 0.25 && overview.commitCount >= 10) {
    reasons.push(
      `${Math.round(catShare("refactor") * 100)}% of commits classified as refactors`
    );
    return {
      id: "relentless_refactorer",
      label: "The Relentless Refactorer",
      blurb: "Not just shipping — reshaping. Structure is a first-class citizen.",
      reasons,
    };
  }

  if (catShare("feature") >= 0.4 && overview.commitCount >= 10) {
    reasons.push(
      `${Math.round(catShare("feature") * 100)}% of commits classified as features`
    );
    return {
      id: "feature_factory",
      label: "The Feature Factory",
      blurb: "New capabilities keep landing. The product surface is expanding.",
      reasons,
    };
  }

  if (density >= 0.55 && overview.ageDays >= 60) {
    reasons.push(
      `Active on ${Math.round(density * 100)}% of calendar days over ${overview.ageDays} days`
    );
    return {
      id: "steady_ship",
      label: "The Steady Ship",
      blurb: "Consistent commits, few long silences. Reliability is the vibe.",
      reasons,
    };
  }

  if (files.length >= 80 && contributors.length <= 3) {
    reasons.push(
      `${files.length} tracked files with only ${contributors.length} contributor(s)`
    );
    return {
      id: "curated_monolith",
      label: "The Carefully Curated Monolith",
      blurb: "A lot of surface area, a tight crew. Ownership runs deep.",
      reasons,
    };
  }

  if (overview.ageDays <= 45 && overview.commitCount >= 40) {
    reasons.push(
      `${overview.commitCount} commits in about ${overview.ageDays} days`
    );
    return {
      id: "fast_experiment",
      label: "The Fast-Moving Experiment",
      blurb: "Young repo, high velocity. Ideas are outrunning the paint.",
      reasons,
    };
  }

  if (overview.commitCount <= 3) {
    reasons.push("Very few commits — early history");
    return {
      id: "first_light",
      label: "First Light",
      blurb: "Just getting started. Every commit is still a founding document.",
      reasons,
    };
  }

  const topCat = categories[0]?.category ?? "other";
  reasons.push(`Top commit category: ${topCat}; density ${density.toFixed(2)}`);
  return {
    id: "steady_ship",
    label: "The Steady Ship",
    blurb: "Measured progress across the timeline — a repository that keeps showing up.",
    reasons,
  };
}
