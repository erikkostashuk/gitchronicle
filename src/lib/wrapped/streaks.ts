import type { ActivityPoint } from "../types/analysis";
import type { StreakInfo } from "./types";

/**
 * Longest consecutive calendar-day streak with ≥1 commit,
 * and longest gap (quiet) between active days.
 * Pure / deterministic.
 */
export function computeStreaks(byDay: ActivityPoint[]): StreakInfo {
  const active = [...byDay]
    .filter((d) => d.commits > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (active.length === 0) {
    return {
      longestActiveDays: 0,
      longestActiveStart: null,
      longestActiveEnd: null,
      longestQuietDays: 0,
      longestQuietStart: null,
      longestQuietEnd: null,
    };
  }

  let bestLen = 1;
  let bestStart = active[0]!.date;
  let bestEnd = active[0]!.date;
  let runLen = 1;
  let runStart = active[0]!.date;

  let quietBest = 0;
  let quietStart: string | null = null;
  let quietEnd: string | null = null;

  for (let i = 1; i < active.length; i++) {
    const prev = parseDay(active[i - 1]!.date);
    const cur = parseDay(active[i]!.date);
    const gap = Math.round((cur - prev) / 86_400_000);

    if (gap === 1) {
      runLen += 1;
      if (runLen > bestLen) {
        bestLen = runLen;
        bestStart = runStart;
        bestEnd = active[i]!.date;
      }
    } else {
      runLen = 1;
      runStart = active[i]!.date;
      // quiet days between last active and this one (exclusive)
      const quietDays = gap - 1;
      if (quietDays > quietBest) {
        quietBest = quietDays;
        quietStart = active[i - 1]!.date;
        quietEnd = active[i]!.date;
      }
    }
  }

  return {
    longestActiveDays: bestLen,
    longestActiveStart: bestStart,
    longestActiveEnd: bestEnd,
    longestQuietDays: quietBest,
    longestQuietStart: quietStart,
    longestQuietEnd: quietEnd,
  };
}

function parseDay(isoDate: string): number {
  // date-only YYYY-MM-DD → UTC midnight
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}
