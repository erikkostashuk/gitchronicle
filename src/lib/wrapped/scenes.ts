import type { AnalysisResult } from "../types/analysis";
import { computePersonality } from "./personality";
import { computeStreaks } from "./streaks";
import type {
  RepositoryPersonality,
  StreakInfo,
  WrappedScene,
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
 * Build an adaptive cinematic Wrapped story from a full analysis result.
 * Pure / deterministic. Omits scenes that lack supporting data.
 */
export function buildWrappedStory(analysis: AnalysisResult): WrappedStory {
  const streaks = computeStreaks(analysis.activity.byDay);
  const personality = computePersonality(analysis, streaks);
  const scenes: WrappedScene[] = [];
  const name = analysis.repository.name;

  push(scenes, sceneOpening(analysis));
  push(scenes, sceneBeginning(analysis));
  push(scenes, sceneHeadline(analysis));
  push(scenes, sceneBusiest(analysis));
  push(scenes, sceneCommitPersonality(analysis));
  push(scenes, sceneRhythm(analysis));
  push(scenes, sceneStreak(analysis, streaks));
  push(scenes, scenePeople(analysis));
  push(scenes, sceneMainCharacter(analysis));
  push(scenes, sceneRisingStar(analysis));
  push(scenes, sceneBusiestFile(analysis));
  push(scenes, sceneDramaticFile(analysis));
  push(scenes, sceneFavorites(analysis));
  push(scenes, sceneArchitecture(analysis));
  push(scenes, sceneGiantCommit(analysis));
  push(scenes, sceneReleases(analysis));
  push(scenes, scenePlotTwist(analysis, streaks));
  push(scenes, sceneCollaboration(analysis));
  push(scenes, sceneCochange(analysis));
  push(scenes, scenePersonality(analysis, personality));
  push(scenes, sceneRecap(analysis, personality, streaks));
  push(scenes, sceneClosing(analysis, personality));

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

function sceneOpening(a: AnalysisResult): WrappedScene {
  const o = a.overview;
  return {
    id: "opening",
    type: "opening",
    kicker: "GitChronicle Wrapped",
    title: a.repository.name,
    subtitle: "Your repository had a year. Let’s replay it.",
    body: `${fmtDate(o.firstCommit)} → ${fmtDate(o.lastCommit)}`,
    metrics: [
      { label: "Commits", value: o.commitCount },
      { label: "Contributors", value: o.contributorCount },
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
    kicker: "The beginning",
    title: "Day zero",
    subtitle: first
      ? truncate(first.subject, 80)
      : `Born ${fmtDate(a.overview.firstCommit)}`,
    hero: fmtDate(a.overview.firstCommit),
    heroLabel: "First commit",
    list: [
      {
        label: "Founding contributor",
        value: founder?.name ?? "Unknown",
      },
      ...firstFiles.map((p) => ({ label: "Early file", value: p })),
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
    kicker: "The headline number",
    title: "Commits that shaped it",
    subtitle: `${o.activeDays} active days · ${o.ageDays} days of history`,
    hero: o.commitCount,
    heroLabel: "total commits",
    metrics: [
      { label: "Per active day", value: perDay },
      { label: "Lines added", value: o.totalAdditions },
      { label: "Lines removed", value: o.totalDeletions },
    ],
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
    kicker: "Peak intensity",
    title: "Your busiest period",
    subtitle: `On ${fmtDate(day.date)}, the repo hit ${day.commits} commits in a single day.`,
    hero: day.commits,
    heroLabel: "commits on the busiest day",
    metrics: [
      { label: "Busiest day", value: fmtDate(day.date) },
      {
        label: "Busiest week",
        value: week ? `${fmtDate(week.date)} · ${week.commits}` : "—",
      },
      {
        label: "Busiest month",
        value: month
          ? `${month.date.slice(0, 7)} · ${month.commits}`
          : "—",
      },
    ],
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
  return {
    id: "commit_personality",
    type: "commit_personality",
    kicker: "Commit personality",
    title: `Mostly ${labelCategory(top.category)}`,
    subtitle: `${Math.round((top.count / total) * 100)}% of categorized commits lean ${labelCategory(top.category)}.`,
    bars,
    chips: word ? [`Recurring word: “${word}”`] : undefined,
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
    kicker: "Coding rhythm",
    title: rhythm.label,
    subtitle: rhythm.blurb,
    hero: `${peakHour}:00`,
    heroLabel: "peak hour (UTC)",
    metrics: [
      { label: "Peak weekday", value: wdNames[peakWd] ?? "—" },
      { label: "Style", value: rhythm.label },
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
    kicker: "Streaks",
    title:
      streaks.longestActiveDays >= 3
        ? `${streaks.longestActiveDays}-day hot streak`
        : "Quiet and loud chapters",
    subtitle:
      streaks.longestActiveStart && streaks.longestActiveEnd
        ? `Longest active run ${fmtDate(streaks.longestActiveStart)} → ${fmtDate(streaks.longestActiveEnd)}`
        : "Activity came in waves.",
    hero: streaks.longestActiveDays,
    heroLabel: "longest active-day streak",
    metrics: [
      {
        label: "Longest quiet",
        value:
          streaks.longestQuietDays > 0
            ? `${streaks.longestQuietDays} days`
            : "None long enough",
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
    kicker: "The cast",
    title: `${a.contributors.length} people left fingerprints`,
    subtitle: "Contribution share from Git history (by commit count).",
    list: top.map((c) => ({
      label: c.name,
      value: c.commits,
      hint: `${Math.round((c.commits / total) * 100)}%`,
    })),
    bars: top.map((c) => ({
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
    kicker: "Main character energy",
    title: lead.name,
    subtitle: `About ${share}% of commits — a playful profile, not a scoreboard.`,
    hero: lead.commits,
    heroLabel: "commits",
    metrics: [
      { label: "Active days", value: lead.activeDays },
      { label: "Peak hour UTC", value: `${peakHour}:00` },
      {
        label: "Primary paths",
        value: lead.primaryPaths
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
  if (a.contributors.length < 3 || a.overview.commitCount < 20) return null;
  // Split timeline in half; find contributor with biggest second-half growth ratio
  const mid =
    (new Date(a.overview.firstCommit).getTime() +
      new Date(a.overview.lastCommit).getTime()) /
    2;
  // Use first/last commit windows as proxy (no per-commit authors in result) —
  // rising star: late firstCommit + high commits relative to tenure
  const ranked = a.contributors
    .filter((c) => c.commits >= 3)
    .map((c) => {
      const start = new Date(c.firstCommit).getTime();
      const lateStart = start > mid ? 1 : 0;
      const velocity =
        c.activeDays > 0 ? c.commits / Math.max(1, c.activeDays) : 0;
      const score = lateStart * 2 + velocity + c.commits / 100;
      return { c, score, lateStart };
    })
    .filter((x) => x.c.id !== a.contributors[0]?.id)
    .sort((x, y) => y.score - x.score);

  const star = ranked[0];
  if (!star || star.lateStart === 0) return null;

  return {
    id: "rising_star",
    type: "rising_star",
    kicker: "Rising star",
    title: star.c.name,
    subtitle: `Joined the story later and ramped up — ${star.c.commits} commits since ${fmtDate(star.c.firstCommit)}.`,
    hero: star.c.commits,
    heroLabel: "commits after joining",
    palette: "gold",
    a11y: `Rising contributor ${star.c.name}.`,
  };
}

function sceneBusiestFile(a: AnalysisResult): WrappedScene | null {
  const f = a.hotspots[0] ?? a.files[0];
  if (!f || f.commits < 2) return null;
  return {
    id: "busiest_file",
    type: "busiest_file",
    kicker: "Hot path",
    title: basename(f.path),
    subtitle: f.path,
    hero: f.commits,
    heroLabel: "times changed",
    metrics: [
      { label: "Churn", value: f.churn },
      { label: "People", value: f.contributors },
      {
        label: "Lifespan",
        value: `${fmtDate(f.firstSeen)} → ${fmtDate(f.lastSeen)}`,
      },
    ],
    chips: f.riskReasons.slice(0, 3),
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
    kicker: "Drama in the diff",
    title: basename(f.path),
    subtitle: `Largest cumulative rewrite signal: +${f.additions} / −${f.deletions}`,
    hero: f.additions + f.deletions,
    heroLabel: "lines touched (lifetime)",
    metrics: [
      { label: "Additions", value: f.additions },
      { label: "Deletions", value: f.deletions },
      { label: "Commits", value: f.commits },
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
    kicker: "Codebase favorites",
    title: lang ? lang.language : "Favorite corners",
    subtitle: lang
      ? `${Math.round(lang.percent * 100)}% of tracked files speak ${lang.language}`
      : "Most active directories by churn",
    chips: a.languages.slice(0, 5).map((l) => `${l.language} ${l.count}`),
    list: a.directories.slice(0, 5).map((d) => ({
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
    kicker: "Architecture shifted",
    title: migrations[0]?.title ?? "Eras of structure",
    subtitle:
      migrations[0]?.description ??
      "Development eras mark natural structural chapters.",
    list: (migrations.length ? migrations : a.eras).slice(0, 5).map((m) => ({
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
    kicker: "The giant commit",
    title: truncate(c.subject, 72),
    subtitle: `${fmtDate(c.date)} · ${c.hash.slice(0, 7)}`,
    hero: c.filesChanged,
    heroLabel: "files touched",
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
    kicker: "Release era",
    title: `${a.releases.length} tagged releases`,
    subtitle: `Most active range: ${biggest.tag} with ${biggest.commits} commits`,
    list: a.releases.slice(0, 6).map((r) => ({
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
      kicker: "Plot twist",
      title: "The long silence",
      subtitle: `${quiet.days} quiet days from ${fmtDate(quiet.start)} to ${fmtDate(quiet.end)} — then history continued.`,
      palette: "slate",
      a11y: `Quiet period of ${quiet.days} days.`,
    };
  }
  if (burst && burst.commits >= 8) {
    return {
      id: "plot_twist",
      type: "plot_twist",
      kicker: "Plot twist",
      title: "Sudden acceleration",
      subtitle: burst.description,
      hero: burst.commits,
      heroLabel: "commits in the burst",
      palette: "gold",
      a11y: burst.description,
    };
  }
  if (migration) {
    return {
      id: "plot_twist",
      type: "plot_twist",
      kicker: "Plot twist",
      title: migration.title,
      subtitle: migration.description,
      palette: "violet",
      a11y: migration.description,
    };
  }
  if (streaks.longestQuietDays >= 14) {
    return {
      id: "plot_twist",
      type: "plot_twist",
      kicker: "Plot twist",
      title: "A chapter of stillness",
      subtitle: `${streaks.longestQuietDays} days without commits between active stretches.`,
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
    kicker: "Collaboration",
    title: "Who builds together",
    subtitle: "Shared file ownership pairs from Git history.",
    list: top.map((e) => ({
      label: `${nameById.get(e.source) ?? e.source} × ${nameById.get(e.target) ?? e.target}`,
      value: e.weight,
      hint: "shared files",
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
    kicker: "Co-change constellation",
    title: "Files that move together",
    subtitle: "Often edited in the same commit — a structural hint.",
    list: top.map((e) => ({
      label: `${basename(e.source)} ↔ ${basename(e.target)}`,
      value: e.weight,
      hint: "co-changes",
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
    kicker: "Repository personality",
    title: personality.label,
    subtitle: personality.blurb,
    chips: personality.reasons,
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
  const topFile = a.hotspots[0]?.path;
  return {
    id: "recap",
    type: "recap",
    kicker: "Final recap",
    title: "The year in a glance",
    subtitle: personality.label,
    metrics: [
      { label: "Commits", value: o.commitCount },
      { label: "Contributors", value: o.contributorCount },
      { label: "Active days", value: o.activeDays },
      { label: "Top language", value: a.languages[0]?.language ?? "—" },
      {
        label: "Busiest month",
        value: month ? month.date.slice(0, 7) : "—",
      },
      { label: "Longest streak", value: streaks.longestActiveDays },
      { label: "Top file", value: topFile ? basename(topFile) : "—" },
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
    kicker: "That’s a wrap",
    title: "Replay complete",
    subtitle: `${a.repository.name} · ${personality.label}`,
    body: "Download share cards, open the full analytics dashboard, or analyze another repository.",
    chips: [
      "Share cards",
      "Deep analytics",
      "Markdown report",
      "Another repo",
    ],
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
      label: "Early bird",
      blurb: "Commits cluster in the morning UTC window.",
    };
  }
  if (peakHour >= 11 && peakHour < 17) {
    return {
      label: "Daytime driver",
      blurb: "Classic working-hours energy in the commit log.",
    };
  }
  if (peakHour >= 17 && peakHour < 22) {
    return {
      label: "Evening shipper",
      blurb: "History thickens after the workday winds down.",
    };
  }
  return {
    label: "Night owl",
    blurb: "Peak commits land deep into the night (UTC).",
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
