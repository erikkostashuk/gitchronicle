import type { AnalysisResult } from "../types/analysis";
import { computePersonality } from "./personality";
import { pickRisingStar } from "./rising-star";
import { computeStreaks } from "./streaks";
import type {
  RepositoryPersonality,
  StreakInfo,
  WrappedScene,
  WrappedSceneType,
  WrappedShareCard,
  WrappedStory,
} from "./types";

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "from",
  "by",
  "is",
  "are",
  "was",
  "be",
  "this",
  "that",
  "it",
  "as",
  "at",
  "into",
  "fix",
  "feat",
  "chore",
  "docs",
  "test",
  "tests",
  "refactor",
  "build",
  "ci",
  "merge",
  "pull",
  "request",
  "update",
  "add",
  "added",
  "remove",
  "removed",
  "use",
  "using",
  "make",
  "more",
  "some",
  "when",
  "where",
  "what",
  "how",
  "why",
  "not",
  "no",
  "yes",
  "new",
  "old",
]);

/**
 * Attention-friendly story length. Opening/closing + ~14 beats (~90s at film pace).
 * Rich repos may produce more candidates; we keep the best ones in narrative order.
 */
export const TARGET_MAX_SCENES = 16;

/** Higher = more likely to survive the budget cut. Spine types are pinned. */
const SCENE_PRIORITY: Record<WrappedSceneType, number> = {
  opening: 100,
  closing: 100,
  headline: 95,
  recap: 94,
  personality: 92,
  beginning: 80,
  busiest: 78,
  people: 76,
  main_character: 74,
  streak: 72,
  favorites: 70,
  rising_star: 68,
  rhythm: 66,
  busiest_file: 64,
  releases: 62,
  giant_commit: 58,
  architecture: 54,
  dramatic_file: 50,
  collaboration: 42,
  cochange: 40,
  plot_twist: 36,
  commit_personality: 32,
};

const PINNED_TYPES = new Set<WrappedSceneType>([
  "opening",
  "headline",
  "personality",
  "recap",
  "closing",
]);

/**
 * Build an adaptive cinematic Wrapped story from a full analysis result.
 * Pure / deterministic. Omits scenes that lack supporting data.
 * Caps length at {@link TARGET_MAX_SCENES} for attention-friendly pacing.
 */
export function buildWrappedStory(analysis: AnalysisResult): WrappedStory {
  const streaks = computeStreaks(analysis.activity.byDay);
  const personality = computePersonality(analysis, streaks);
  const candidates: WrappedScene[] = [];
  const name = analysis.repository.name;

  push(candidates, sceneOpening(analysis));
  push(candidates, sceneBeginning(analysis));
  push(candidates, sceneHeadline(analysis));
  push(candidates, sceneBusiest(analysis));
  push(candidates, sceneCommitPersonality(analysis));
  push(candidates, sceneRhythm(analysis));
  push(candidates, sceneStreak(analysis, streaks));
  push(candidates, scenePeople(analysis));
  push(candidates, sceneMainCharacter(analysis));
  push(candidates, sceneRisingStar(analysis));
  push(candidates, sceneBusiestFile(analysis));
  push(candidates, sceneDramaticFile(analysis));
  push(candidates, sceneFavorites(analysis));
  push(candidates, sceneArchitecture(analysis));
  push(candidates, sceneGiantCommit(analysis));
  push(candidates, sceneReleases(analysis));
  push(candidates, scenePlotTwist(analysis, streaks));
  push(candidates, sceneCollaboration(analysis));
  push(candidates, sceneCochange(analysis));
  push(candidates, scenePersonality(analysis, personality));
  push(candidates, sceneRecap(analysis, personality, streaks));
  push(candidates, sceneClosing(analysis, personality));

  const scenes = trimScenesToBudget(candidates, TARGET_MAX_SCENES);
  const shareCards = collectShareCards(scenes, analysis, personality, streaks);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    repositoryName: name,
    personality,
    streaks,
    scenes,
    shareCards,
  };
}

function push(list: WrappedScene[], scene: WrappedScene | null) {
  if (scene) list.push(scene);
}

/**
 * Keep narrative order, pin the spine, fill remaining slots by priority.
 * Deterministic: equal priority keeps earlier (story-order) scenes.
 */
export function trimScenesToBudget(
  scenes: WrappedScene[],
  max: number = TARGET_MAX_SCENES
): WrappedScene[] {
  if (scenes.length <= max) return scenes;

  const pinned = scenes.filter((s) => PINNED_TYPES.has(s.type));
  const optional = scenes.filter((s) => !PINNED_TYPES.has(s.type));
  const slots = Math.max(0, max - pinned.length);

  // Stable sort: higher priority first; original index as tiebreaker
  const ranked = optional
    .map((scene, order) => ({ scene, order, p: SCENE_PRIORITY[scene.type] ?? 0 }))
    .sort((a, b) => b.p - a.p || a.order - b.order)
    .slice(0, slots)
    .map((x) => x.scene);

  const keep = new Set<WrappedScene>([...pinned, ...ranked]);
  return scenes.filter((s) => keep.has(s));
}

function sceneOpening(a: AnalysisResult): WrappedScene {
  const o = a.overview;
  return {
    id: "opening",
    type: "opening",
    kicker: "GitChronicle Wrapped",
    title: a.repository.name,
    subtitle: "Your repo had a year. We’re putting it on the big screen.",
    body: `${fmtDate(o.firstCommit)} → ${fmtDate(o.lastCommit)} · grab popcorn 🍿`,
    metrics: [
      { label: "Commits", value: o.commitCount },
      { label: "People", value: o.contributorCount },
      { label: "Files", value: o.fileCount },
    ],
    palette: "aurora",
    a11y: `Opening for ${a.repository.name} spanning ${fmtDate(o.firstCommit)} to ${fmtDate(o.lastCommit)}.`,
  };
}

function sceneBeginning(a: AnalysisResult): WrappedScene | null {
  if (a.overview.commitCount < 1) return null;
  const first = a.timeline[0] ?? null;
  const founder = a.contributors
    .slice()
    .sort((x, y) => x.firstCommit.localeCompare(y.firstCommit))[0];
  const firstFiles = a.files
    .slice()
    .sort((x, y) => x.firstSeen.localeCompare(y.firstSeen))
    .slice(0, 4)
    .map((f) => f.path);

  return {
    id: "beginning",
    type: "beginning",
    kicker: "Cold open",
    title: "Someone typed git init",
    subtitle: first
      ? `First line of dialogue: “${truncate(first.subject, 64)}”`
      : `Born ${fmtDate(a.overview.firstCommit)} — destiny said “bet.”`,
    hero: fmtDate(a.overview.firstCommit),
    heroLabel: "the day the chaos began",
    list: [
      {
        label: "Founding hero",
        value: founder?.name ?? "Unknown legend",
      },
      ...firstFiles.slice(0, 3).map((p) => ({ label: "Early prop", value: p })),
    ],
    palette: "midnight",
    a11y: `Repository began on ${fmtDate(a.overview.firstCommit)}.`,
  };
}

function sceneHeadline(a: AnalysisResult): WrappedScene {
  const o = a.overview;
  const perDay =
    o.activeDays > 0 ? (o.commitCount / o.activeDays).toFixed(1) : "—";
  return {
    id: "headline",
    type: "headline",
    kicker: "The money shot",
    title: "That’s a lot of “fix typo”",
    subtitle: `${o.activeDays} days of actually showing up · ${o.ageDays} days on Earth`,
    hero: o.commitCount,
    heroLabel: "commits (yes, that many)",
    metrics: [
      { label: "Per active day", value: perDay },
      { label: "Lines yeeted in", value: o.totalAdditions },
      { label: "Lines yeeted out", value: o.totalDeletions },
    ],
    series: monthSeries(a, 18),
    palette: "ember",
    a11y: `${o.commitCount} commits across ${o.activeDays} active days.`,
  };
}

function sceneBusiest(a: AnalysisResult): WrappedScene | null {
  if (a.activity.byDay.length === 0) return null;
  const day = maxBy(a.activity.byDay, (d) => d.commits);
  const week = maxBy(a.activity.byWeek, (d) => d.commits);
  const month = maxBy(a.activity.byMonth, (d) => d.commits);
  if (!day || day.commits < 1) return null;

  return {
    id: "busiest",
    type: "busiest",
    kicker: "Main-character day",
    title: day.commits >= 5 ? "HR would like a word" : "Busy bee energy",
    subtitle: `On ${fmtDate(day.date)} this repo went full send — ${day.commits} commits before dinner.`,
    hero: day.commits,
    heroLabel: "commits in one day 🔥",
    metrics: [
      { label: "That day", value: fmtDate(day.date) },
      {
        label: "Wildest week",
        value: week ? `${fmtDate(week.date)} · ${week.commits}` : "—",
      },
      {
        label: "Chaos month",
        value: month ? `${month.date.slice(0, 7)} · ${month.commits}` : "—",
      },
    ],
    series: dayWindow(a, day.date, 21),
    palette: "gold",
    share: {
      kind: "busiest",
      headline: "Busiest day",
      stat: String(day.commits),
      detail: `commits on ${fmtDate(day.date)}`,
      repoName: a.repository.name,
    },
    a11y: `Busiest day ${fmtDate(day.date)} with ${day.commits} commits.`,
  };
}

function sceneCommitPersonality(a: AnalysisResult): WrappedScene | null {
  if (a.categories.length === 0 || a.overview.commitCount < 3) return null;
  const top = a.categories[0]!;
  const total = a.categories.reduce((s, c) => s + c.count, 0) || 1;
  const bars = a.categories.slice(0, 6).map((c) => ({
    label: c.category,
    value: c.count,
    max: top.count,
  }));
  const word = topCommitWord(a);
  const pct = Math.round((top.count / total) * 100);
  const jokes: Record<string, string> = {
    feature: "Feature factory. Product managers are sweating (in a good way).",
    fix: "Bug squasher energy. The bugs filed a restraining order.",
    refactor: "Refactor romantic. Same app, hotter internals.",
    docs: "Docs hero. Future-you just sent a thank-you card.",
    test: "Test gremlin. Coverage is a love language.",
    build: "Pipeline poet. CI is your co-author.",
    chore: "Chore champion. Somebody has to take out the trash.",
    other: "Commit wildcards. Labels are for cowards.",
  };
  return {
    id: "commit_personality",
    type: "commit_personality",
    kicker: "Vibe check",
    title: `Mostly ${labelCategory(top.category)}`,
    subtitle: jokes[top.category] ?? `${pct}% of the plot is ${labelCategory(top.category)}.`,
    bars: bars.slice(0, 5),
    segments: withRemainder(
      a.categories.map((c) => ({
        label: labelCategory(c.category),
        value: c.count,
      })),
      5
    ),
    chips: word
      ? [`Favorite word: “${word}”`, `${pct}% ${top.category}`]
      : [`${pct}% ${top.category}`],
    palette: "violet",
    a11y: `Top commit category ${top.category} with ${top.count} commits.`,
  };
}

function sceneRhythm(a: AnalysisResult): WrappedScene | null {
  if (a.overview.commitCount < 3) return null;
  const hours = a.activity.hourHistogram;
  const weekdays = a.activity.weekdayHistogram;
  const peakHour = hours.indexOf(Math.max(...hours));
  const peakWd = weekdays.indexOf(Math.max(...weekdays));
  const rhythm = classifyRhythm(peakHour);
  const wdNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    id: "rhythm",
    type: "rhythm",
    kicker: "When the magic happens",
    title: rhythm.label,
    subtitle: rhythm.blurb,
    hero: `${peakHour}:00`,
    heroLabel: "peak hour UTC (circadian chaos)",
    metrics: [
      { label: "Peak weekday", value: wdNames[peakWd] ?? "—" },
      { label: "Archetype", value: rhythm.label },
    ],
    bars: hours.map((v, i) => ({
      label: `${i}`,
      value: v,
      max: Math.max(...hours, 1),
    })),
    palette: "ocean",
    a11y: `Peak activity at ${peakHour}:00 UTC, classified as ${rhythm.label}.`,
  };
}

function sceneStreak(
  a: AnalysisResult,
  streaks: StreakInfo
): WrappedScene | null {
  if (streaks.longestActiveDays < 2 && streaks.longestQuietDays < 7) {
    return null;
  }
  return {
    id: "streak",
    type: "streak",
    kicker: "Duolingo would be proud",
    title:
      streaks.longestActiveDays >= 3
        ? `${streaks.longestActiveDays}-day hot streak 🔥`
        : "On-again, off-again",
    subtitle:
      streaks.longestActiveStart && streaks.longestActiveEnd
        ? `Kept the lights on ${fmtDate(streaks.longestActiveStart)} → ${fmtDate(streaks.longestActiveEnd)}. Consistency is sexy.`
        : "Activity came in waves. Surf’s up.",
    hero: streaks.longestActiveDays,
    heroLabel: "days in a row (no skip)",
    metrics: [
      {
        label: "Longest nap",
        value:
          streaks.longestQuietDays > 0
            ? `${streaks.longestQuietDays} quiet days`
            : "Basically no napping",
      },
    ],
    palette: "forest",
    share: {
      kind: "streak",
      headline: "Longest streak",
      stat: String(streaks.longestActiveDays),
      detail: "consecutive active days",
      repoName: a.repository.name,
    },
    a11y: `Longest active streak ${streaks.longestActiveDays} days; longest quiet ${streaks.longestQuietDays} days.`,
  };
}

function scenePeople(a: AnalysisResult): WrappedScene | null {
  if (a.contributors.length < 2) return null;
  const top = a.contributors.slice(0, 6);
  const total = a.overview.commitCount || 1;
  return {
    id: "people",
    type: "people",
    kicker: "Ensemble cast",
    title: `${a.contributors.length} humans left fingerprints`,
    subtitle: "Nobody ships alone… except when they absolutely do.",
    list: top.slice(0, 5).map((c) => ({
      label: c.name,
      value: c.commits,
      hint: `${Math.round((c.commits / total) * 100)}%`,
    })),
    bars: top.slice(0, 5).map((c) => ({
      label: c.name,
      value: c.commits,
      max: top[0]!.commits,
    })),
    palette: "aurora",
    a11y: `${a.contributors.length} contributors; top is ${top[0]?.name}.`,
  };
}

function sceneMainCharacter(a: AnalysisResult): WrappedScene | null {
  const lead = a.contributors[0];
  if (!lead || a.overview.commitCount < 1) return null;
  const peakHour = lead.hourHistogram.indexOf(Math.max(...lead.hourHistogram));
  const share = Math.round(lead.ownershipShare * 100);
  return {
    id: "main_character",
    type: "main_character",
    kicker: "And the Oscar goes to…",
    title: lead.name,
    subtitle:
      share >= 40
        ? `${share}% of commits. Main character energy. They know.`
        : `${share}% of the plot — co-star with veto power.`,
    hero: lead.commits,
    heroLabel: "personal body count (commits)",
    metrics: [
      { label: "Active days", value: lead.activeDays },
      { label: "Peak hour UTC", value: `${peakHour}:00` },
      {
        label: "Hangouts",
        value:
          lead.primaryPaths
            .slice(0, 2)
            .map((p) => p.path)
            .join(", ") || "—",
      },
    ],
    chips: lead.languages.slice(0, 4).map((l) => l.language),
    palette: "violet",
    share: {
      kind: "top_contributor",
      headline: "Top contributor",
      stat: lead.name,
      detail: `${lead.commits} commits · ${share}% share`,
      repoName: a.repository.name,
    },
    a11y: `Main contributor ${lead.name} with ${lead.commits} commits.`,
  };
}

function sceneRisingStar(a: AnalysisResult): WrappedScene | null {
  const star = pickRisingStar(a);
  if (!star) return null;
  const c = star.contributor;
  const sharePct = Math.round(star.share * 100);
  const latePct = Math.round(star.lateness * 100);
  return {
    id: "rising_star",
    type: "rising_star",
    kicker: "Rookie of the year",
    title: c.name,
    subtitle: `Joined after ${latePct}% of the timeline — then hit ${c.commits} commits (${sharePct}% of the plot). Fashionably late. Extremely effective.`,
    hero: c.commits,
    heroLabel: "commits after the plot twist",
    metrics: [
      { label: "First appearance", value: fmtDate(c.firstCommit) },
      { label: "Active days", value: c.activeDays },
      {
        label: "Velocity",
        value: `${star.velocity.toFixed(1)}/day`,
      },
    ],
    chips: c.languages.slice(0, 3).map((l) => l.language),
    palette: "gold",
    share: {
      kind: "rising_star",
      headline: "Rising star",
      stat: c.name,
      detail: `${c.commits} commits after joining late · ${sharePct}% share`,
      repoName: a.repository.name,
    },
    a11y: `Rising contributor ${c.name} with ${c.commits} commits after a late start.`,
  };
}

function sceneBusiestFile(a: AnalysisResult): WrappedScene | null {
  const f = a.hotspots[0] ?? a.files[0];
  if (!f || f.commits < 2) return null;
  return {
    id: "busiest_file",
    type: "busiest_file",
    kicker: "This file has trauma",
    title: basename(f.path),
    subtitle: `${f.path} — changed so often it deserves hazard pay.`,
    hero: f.commits,
    heroLabel: "times someone poked it",
    metrics: [
      { label: "Churn", value: f.churn },
      { label: "Suspects", value: f.contributors },
      {
        label: "Lifespan",
        value: `${fmtDate(f.firstSeen)} → ${fmtDate(f.lastSeen)}`,
      },
    ],
    chips: f.riskReasons.slice(0, 2),
    palette: "ember",
    a11y: `Busiest file ${f.path} changed ${f.commits} times.`,
  };
}

function sceneDramaticFile(a: AnalysisResult): WrappedScene | null {
  if (a.files.length === 0) return null;
  const f = [...a.files].sort(
    (x, y) => y.additions + y.deletions - (x.additions + x.deletions)
  )[0]!;
  if (f.additions + f.deletions < 50) return null;
  return {
    id: "dramatic_file",
    type: "dramatic_file",
    kicker: "Oscar for best drama",
    title: basename(f.path),
    subtitle: `+${f.additions} / −${f.deletions}. Deleted more lines than a bad reboot.`,
    hero: f.additions + f.deletions,
    heroLabel: "lines that lived through it",
    metrics: [
      { label: "Born", value: `+${f.additions}` },
      { label: "Yeeted", value: `−${f.deletions}` },
      { label: "Acts", value: f.commits },
    ],
    palette: "ember",
    share: {
      kind: "dramatic_file",
      headline: "Most dramatic file",
      stat: basename(f.path),
      detail: `+${f.additions} / −${f.deletions} lifetime`,
      repoName: a.repository.name,
    },
    a11y: `Dramatic file ${f.path} with ${f.additions + f.deletions} lines touched.`,
  };
}

function sceneFavorites(a: AnalysisResult): WrappedScene | null {
  if (a.languages.length === 0 && a.directories.length === 0) return null;
  const lang = a.languages[0];
  return {
    id: "favorites",
    type: "favorites",
    kicker: "House language",
    title: lang ? lang.language : "Favorite corners",
    subtitle: lang
      ? `${Math.round(lang.percent * 100)}% of the files are speaking ${lang.language}. The rest are freelancers.`
      : "Directories with the most drama (churn).",
    hero: lang ? `${Math.round(lang.percent * 100)}%` : undefined,
    heroLabel: lang ? "of the files" : undefined,
    chips: a.languages.slice(0, 4).map((l) => `${l.language}`),
    segments: withRemainder(
      a.languages.map((l) => ({ label: l.language, value: l.count })),
      5
    ),
    list: a.directories.slice(0, 4).map((d) => ({
      label: d.path,
      value: d.churn,
      hint: `${d.files} files`,
    })),
    palette: "ocean",
    share: lang
      ? {
          kind: "language",
          headline: "Top language",
          stat: lang.language,
          detail: `${Math.round(lang.percent * 100)}% of files`,
          repoName: a.repository.name,
        }
      : undefined,
    a11y: `Top language ${lang?.language ?? "unknown"}.`,
  };
}

function sceneArchitecture(a: AnalysisResult): WrappedScene | null {
  const migrations = a.milestones.filter(
    (m) => m.kind === "migration" || m.kind === "rewrite"
  );
  if (migrations.length === 0 && a.eras.length < 2) return null;
  return {
    id: "architecture",
    type: "architecture",
    kicker: "The set redesign",
    title: migrations[0]?.title ?? "The floor plan changed",
    subtitle:
      migrations[0]?.description ??
      "Eras dropped. The furniture moved. Nobody asked the files.",
    list: (migrations.length ? migrations : a.eras).slice(0, 4).map((m) => ({
      label: "title" in m ? m.title : m.name,
      value: "date" in m ? fmtDate(m.date) : `${fmtDate(m.start)} → ${fmtDate(m.end)}`,
      hint: "summary" in m ? m.summary : m.description,
    })),
    palette: "slate",
    a11y: "Architectural or era shifts detected in history.",
  };
}

function sceneGiantCommit(a: AnalysisResult): WrappedScene | null {
  const c = a.largeCommits[0];
  if (!c) {
    // fallback: largest by files+churn from timeline is unavailable; skip
    return null;
  }
  return {
    id: "giant_commit",
    type: "giant_commit",
    kicker: "Boss fight commit",
    title: truncate(c.subject, 56),
    subtitle: `${fmtDate(c.date)} · ${c.hash.slice(0, 7)} — that’s not a commit, that’s a cry for help.`,
    hero: c.filesChanged,
    heroLabel: "files in the blast radius",
    metrics: [
      { label: "Additions", value: c.additions },
      { label: "Deletions", value: c.deletions },
    ],
    palette: "midnight",
    a11y: `Large commit ${c.hash.slice(0, 7)} touched ${c.filesChanged} files.`,
  };
}

function sceneReleases(a: AnalysisResult): WrappedScene | null {
  if (a.releases.length === 0) return null;
  const biggest = [...a.releases].sort((x, y) => y.commits - x.commits)[0]!;
  return {
    id: "releases",
    type: "releases",
    kicker: "Season finales",
    title: `${a.releases.length} tagged drops`,
    subtitle: `Biggest season: ${biggest.tag} with ${biggest.commits} commits. Ship it.`,
    list: a.releases.slice(0, 4).map((r) => ({
      label: r.tag,
      value: r.commits,
      hint: fmtDate(r.date),
    })),
    palette: "forest",
    a11y: `${a.releases.length} releases; largest ${biggest.tag}.`,
  };
}

function scenePlotTwist(
  a: AnalysisResult,
  streaks: StreakInfo
): WrappedScene | null {
  // Prefer real unusual events — never fabricate
  const quiet = a.quietPeriods[0];
  const burst = a.bursts[0];
  const migration = a.milestones.find(
    (m) => m.kind === "migration" || m.kind === "rewrite"
  );

  if (quiet && quiet.days >= 21) {
    return {
      id: "plot_twist",
      type: "plot_twist",
      kicker: "Plot twist 😱",
      title: "…and then nobody committed",
      subtitle: `${quiet.days} days of radio silence (${fmtDate(quiet.start)} → ${fmtDate(quiet.end)}). Then: sequel energy.`,
      palette: "slate",
      a11y: `Quiet period of ${quiet.days} days.`,
    };
  }
  if (burst && burst.commits >= 8) {
    return {
      id: "plot_twist",
      type: "plot_twist",
      kicker: "Plot twist ⚡",
      title: "Everyone panic-shipped",
      subtitle: burst.description + " Caffeine was involved.",
      hero: burst.commits,
      heroLabel: "commits in the sprint of doom",
      palette: "gold",
      a11y: burst.description,
    };
  }
  if (migration) {
    return {
      id: "plot_twist",
      type: "plot_twist",
      kicker: "Plot twist 🌀",
      title: migration.title,
      subtitle: migration.description + " The furniture moved overnight.",
      palette: "violet",
      a11y: migration.description,
    };
  }
  if (streaks.longestQuietDays >= 14) {
    return {
      id: "plot_twist",
      type: "plot_twist",
      kicker: "Plot twist 😴",
      title: "Vacation arc",
      subtitle: `${streaks.longestQuietDays} days without commits. Touching grass? Or just stuck in review?`,
      palette: "midnight",
      a11y: `Quiet streak ${streaks.longestQuietDays} days.`,
    };
  }
  return null;
}

function sceneCollaboration(a: AnalysisResult): WrappedScene | null {
  if (a.collaboration.edges.length === 0 || a.contributors.length < 2) {
    return null;
  }
  const nameById = new Map(a.contributors.map((c) => [c.id, c.name]));
  const top = [...a.collaboration.edges]
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 6);
  return {
    id: "collaboration",
    type: "collaboration",
    kicker: "Buddy-cop energy",
    title: "Dynamic duos",
    subtitle: "They keep touching the same files. It’s giving pair programming… or shared pain.",
    list: top.slice(0, 4).map((e) => ({
      label: `${nameById.get(e.source) ?? e.source} × ${nameById.get(e.target) ?? e.target}`,
      value: `${e.weight} shared file${e.weight === 1 ? "" : "s"}`,
    })),
    palette: "aurora",
    a11y: "Contributor collaboration pairs.",
  };
}

function sceneCochange(a: AnalysisResult): WrappedScene | null {
  if (a.coChange.edges.length === 0) return null;
  const top = [...a.coChange.edges]
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 6);
  return {
    id: "cochange",
    type: "cochange",
    kicker: "Ride-or-die files",
    title: "Never commit alone",
    subtitle: "These files show up to the same parties. Codependency, but make it architecture.",
    list: top.slice(0, 4).map((e) => ({
      label: `${basename(e.source)} ↔ ${basename(e.target)}`,
      value: `changed together ${e.weight}×`,
    })),
    palette: "ocean",
    a11y: "Top co-changed file pairs.",
  };
}

function scenePersonality(
  a: AnalysisResult,
  personality: RepositoryPersonality
): WrappedScene {
  return {
    id: "personality",
    type: "personality",
    kicker: "Zodiac, but for git",
    title: personality.label,
    subtitle: personality.blurb + " (This was math. Not vibes. Mostly.)",
    chips: personality.reasons.slice(0, 3),
    palette: "violet",
    share: {
      kind: "personality",
      headline: "Personality",
      stat: personality.label,
      detail: personality.blurb,
      repoName: a.repository.name,
    },
    a11y: `Personality ${personality.label}: ${personality.blurb}`,
  };
}

function sceneRecap(
  a: AnalysisResult,
  personality: RepositoryPersonality,
  streaks: StreakInfo
): WrappedScene {
  const o = a.overview;
  const month = maxBy(a.activity.byMonth, (d) => d.commits);
  return {
    id: "recap",
    type: "recap",
    kicker: "End credits roll",
    title: "In case you zoned out",
    subtitle: `${personality.label} · ${a.repository.name} · we love a full circle`,
    metrics: [
      { label: "Commits", value: o.commitCount },
      { label: "People", value: o.contributorCount },
      { label: "Active days", value: o.activeDays },
      { label: "Language", value: a.languages[0]?.language ?? "—" },
      {
        label: "Peak month",
        value: month ? month.date.slice(0, 7) : "—",
      },
      { label: "Streak", value: streaks.longestActiveDays },
    ],
    palette: "aurora",
    share: {
      kind: "recap",
      headline: a.repository.name,
      stat: String(o.commitCount),
      detail: `commits · ${o.contributorCount} people · ${personality.label}`,
      repoName: a.repository.name,
    },
    a11y: `Recap: ${o.commitCount} commits, ${o.contributorCount} contributors, personality ${personality.label}.`,
  };
}

function sceneClosing(
  a: AnalysisResult,
  personality: RepositoryPersonality
): WrappedScene {
  return {
    id: "closing",
    type: "closing",
    kicker: "Cut! Print it!",
    title: "Go touch grass",
    subtitle: `${a.repository.name} · ${personality.label} · thanks for sitting through git theater`,
    body: "Steal a share card. Dive into analytics. Or analyze another victim—uh, repository.",
    chips: ["Share cards", "Analytics", "Report", "Another repo"],
    palette: "midnight",
    a11y: "Closing scene with export and dashboard options.",
  };
}

function collectShareCards(
  scenes: WrappedScene[],
  a: AnalysisResult,
  personality: RepositoryPersonality,
  streaks: StreakInfo
): WrappedShareCard[] {
  const fromScenes = scenes
    .map((s) => s.share)
    .filter((s): s is WrappedShareCard => !!s);
  const byKind = new Map(fromScenes.map((c) => [c.kind, c]));
  // Ensure minimum set
  if (!byKind.has("recap")) {
    byKind.set("recap", {
      kind: "recap",
      headline: a.repository.name,
      stat: String(a.overview.commitCount),
      detail: `commits · ${personality.label}`,
      repoName: a.repository.name,
    });
  }
  if (!byKind.has("personality")) {
    byKind.set("personality", {
      kind: "personality",
      headline: "Personality",
      stat: personality.label,
      detail: personality.blurb,
      repoName: a.repository.name,
    });
  }
  if (!byKind.has("streak") && streaks.longestActiveDays > 0) {
    byKind.set("streak", {
      kind: "streak",
      headline: "Longest streak",
      stat: String(streaks.longestActiveDays),
      detail: "consecutive active days",
      repoName: a.repository.name,
    });
  }
  return [...byKind.values()];
}

// —— helpers ——

/**
 * Keep the top `limit` parts and fold the tail into "Other", so a proportional
 * field always sums to the real whole (percentages match the headline stat).
 */
function withRemainder(
  parts: { label: string; value: number }[],
  limit: number
): { label: string; value: number }[] {
  if (parts.length <= limit) return parts;
  const head = parts.slice(0, limit);
  const rest = parts.slice(limit).reduce((s, p) => s + p.value, 0);
  return rest > 0 ? [...head, { label: "Other", value: rest }] : head;
}

/** Trailing monthly commit columns, peak flagged. Capped for smooth rendering. */
function monthSeries(
  a: AnalysisResult,
  limit: number
): { label: string; value: number; highlight?: boolean }[] {
  const months = a.activity.byMonth.slice(-limit);
  if (months.length === 0) return [];
  const peak = Math.max(...months.map((m) => m.commits));
  return months.map((m) => ({
    label: m.date.slice(0, 7),
    value: m.commits,
    highlight: m.commits === peak,
  }));
}

/** Daily commits centred on a date — the "week either side" of a peak. */
function dayWindow(
  a: AnalysisResult,
  center: string,
  span: number
): { label: string; value: number; highlight?: boolean }[] {
  const days = a.activity.byDay;
  if (days.length === 0) return [];
  const idx = days.findIndex((d) => d.date === center);
  const anchor = idx >= 0 ? idx : days.length - 1;
  const half = Math.floor(span / 2);
  const start = Math.max(0, Math.min(anchor - half, days.length - span));
  return days.slice(start, start + span).map((d) => ({
    label: d.date,
    value: d.commits,
    highlight: d.date === center,
  }));
}

function maxBy<T>(arr: T[], fn: (t: T) => number): T | null {
  if (arr.length === 0) return null;
  return arr.reduce((best, cur) => (fn(cur) > fn(best) ? cur : best));
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

function labelCategory(c: string): string {
  const map: Record<string, string> = {
    feature: "features",
    fix: "fixes",
    refactor: "refactors",
    docs: "docs",
    test: "tests",
    build: "build",
    chore: "chores",
    other: "misc",
  };
  return map[c] ?? c;
}

function classifyRhythm(peakHour: number): { label: string; blurb: string } {
  if (peakHour >= 5 && peakHour < 11) {
    return {
      label: "Early bird ☕",
      blurb: "Commits before breakfast. Sleep is for people without merge conflicts… wait.",
    };
  }
  if (peakHour >= 11 && peakHour < 17) {
    return {
      label: "9-to-5 chaos agent",
      blurb: "Peak during work hours. Respectable. Suspicious. Both.",
    };
  }
  if (peakHour >= 17 && peakHour < 22) {
    return {
      label: "After-hours shipper 🌙",
      blurb: "The real work starts when Slack goes quiet.",
    };
  }
  return {
    label: "Night owl 🦉",
    blurb: "Peak commits after midnight UTC. Sleep schedule? Never heard of her.",
  };
}

function topCommitWord(a: AnalysisResult): string | null {
  // Use large commit subjects + milestones as proxy word cloud
  const texts = [
    ...a.largeCommits.map((c) => c.subject),
    ...a.milestones.map((m) => m.title),
    ...a.eras.map((e) => e.name),
  ];
  const counts = new Map<string, number>();
  for (const t of texts) {
    for (const raw of t.toLowerCase().split(/[^a-z0-9]+/)) {
      if (raw.length < 4 || STOP.has(raw) || /^\d+$/.test(raw)) continue;
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((x, y) => y[1] - x[1]);
  return ranked[0]?.[0] ?? null;
}

export type { WrappedStory };
