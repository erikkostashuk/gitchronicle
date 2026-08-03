import type {
  ActivityPoint,
  AnalysisResult,
  CategoryCount,
  CoChangeEdge,
  CollaborationEdge,
  CommitWithFiles,
  ContributorStats,
  DirectoryStats,
  Era,
  FileStats,
  GrowthPoint,
  HeatmapCell,
  LanguageSeries,
  Milestone,
  ReleaseInfo,
  StorySlide,
  TagInfo,
  TimelineSample,
} from "../types/analysis";
import { groupBy, startOfDay, uniqueBy } from "../utils";
import { categorizeCommit, tallyCategories } from "./categories";
import { isIgnorablePath, languageFromPath } from "./languages";

export interface AnalyzeInput {
  commits: CommitWithFiles[];
  tags: TagInfo[];
  repository: AnalysisResult["repository"];
  limits?: {
    maxGraphNodes?: number;
    maxGraphEdges?: number;
    maxTimelineSamples?: number;
    maxHotspots?: number;
  };
}

function contributorId(name: string, email: string): string {
  const e = email.trim().toLowerCase();
  if (e) return e;
  return `name:${name.trim().toLowerCase()}`;
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday-start
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7) + "-01";
}

function parentDir(filePath: string): string {
  const idx = filePath.lastIndexOf("/");
  if (idx <= 0) return "/";
  return filePath.slice(0, idx);
}

export function buildContributorAliasMap(
  commits: CommitWithFiles[]
): Map<string, { id: string; name: string; email: string; aliases: Set<string> }> {
  // Merge by email primarily; same email different names → aliases
  const byEmail = new Map<
    string,
    { id: string; name: string; email: string; aliases: Set<string> }
  >();
  for (const c of commits) {
    const id = contributorId(c.authorName, c.authorEmail);
    const existing = byEmail.get(id);
    if (!existing) {
      byEmail.set(id, {
        id,
        name: c.authorName,
        email: c.authorEmail,
        aliases: new Set([c.authorName]),
      });
    } else {
      existing.aliases.add(c.authorName);
      // Prefer longer/more complete name
      if (c.authorName.length > existing.name.length) {
        existing.name = c.authorName;
      }
    }
  }
  return byEmail;
}

export function computeActivity(
  commits: CommitWithFiles[]
): AnalysisResult["activity"] {
  const byDayMap = new Map<
    string,
    { commits: number; additions: number; deletions: number; contributors: Set<string> }
  >();
  const hourHistogram = Array.from({ length: 24 }, () => 0);
  const weekdayHistogram = Array.from({ length: 7 }, () => 0);

  for (const c of commits) {
    const day = startOfDay(new Date(c.authorDate));
    const entry = byDayMap.get(day) ?? {
      commits: 0,
      additions: 0,
      deletions: 0,
      contributors: new Set<string>(),
    };
    entry.commits += 1;
    entry.additions += c.additions;
    entry.deletions += c.deletions;
    entry.contributors.add(contributorId(c.authorName, c.authorEmail));
    byDayMap.set(day, entry);

    const d = new Date(c.authorDate);
    hourHistogram[d.getUTCHours()]! += 1;
    weekdayHistogram[d.getUTCDay()]! += 1;
  }

  const byDay: ActivityPoint[] = [...byDayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      commits: v.commits,
      additions: v.additions,
      deletions: v.deletions,
      contributors: v.contributors.size,
    }));

  const rollup = (
    keyFn: (date: string) => string
  ): ActivityPoint[] => {
    const map = new Map<
      string,
      { commits: number; additions: number; deletions: number; contributors: number }
    >();
    for (const p of byDay) {
      const k = keyFn(p.date);
      const e = map.get(k) ?? {
        commits: 0,
        additions: 0,
        deletions: 0,
        contributors: 0,
      };
      e.commits += p.commits;
      e.additions += p.additions;
      e.deletions += p.deletions;
      e.contributors = Math.max(e.contributors, p.contributors);
      map.set(k, e);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  };

  const heatmap: HeatmapCell[] = byDay.map((d) => ({
    date: d.date,
    count: d.commits,
  }));

  return {
    byDay,
    byWeek: rollup(weekKey),
    byMonth: rollup(monthKey),
    heatmap,
    hourHistogram,
    weekdayHistogram,
  };
}

export function computeFileStats(commits: CommitWithFiles[]): FileStats[] {
  type Acc = {
    path: string;
    commits: number;
    additions: number;
    deletions: number;
    firstSeen: string;
    lastSeen: string;
    contributors: Map<string, number>;
  };
  const files = new Map<string, Acc>();

  // Process chronological (oldest first)
  const ordered = [...commits].sort(
    (a, b) => new Date(a.authorDate).getTime() - new Date(b.authorDate).getTime()
  );

  for (const c of ordered) {
    const cid = contributorId(c.authorName, c.authorEmail);
    for (const f of c.files) {
      if (isIgnorablePath(f.path)) continue;
      if (f.status === "deleted") {
        // still count churn
      }
      let acc = files.get(f.path);
      if (!acc && f.previousPath && files.has(f.previousPath)) {
        // rename: move stats
        acc = files.get(f.previousPath)!;
        files.delete(f.previousPath);
        acc.path = f.path;
        files.set(f.path, acc);
      }
      if (!acc) {
        acc = {
          path: f.path,
          commits: 0,
          additions: 0,
          deletions: 0,
          firstSeen: c.authorDate,
          lastSeen: c.authorDate,
          contributors: new Map(),
        };
        files.set(f.path, acc);
      }
      acc.commits += 1;
      acc.additions += f.additions;
      acc.deletions += f.deletions;
      acc.lastSeen = c.authorDate;
      acc.contributors.set(cid, (acc.contributors.get(cid) ?? 0) + 1);
    }
  }

  const now = ordered.length
    ? new Date(ordered[ordered.length - 1]!.authorDate).getTime()
    : Date.now();

  const result: FileStats[] = [];
  for (const acc of files.values()) {
    const ownership = [...acc.contributors.entries()]
      .map(([contributorId, count]) => ({
        contributorId,
        commits: count,
        share: count / acc.commits,
      }))
      .sort((a, b) => b.commits - a.commits);

    const topShare = ownership[0]?.share ?? 1;
    // bus factor: min people to cover 50% of commits
    let covered = 0;
    let busFactor = 0;
    for (const o of ownership) {
      covered += o.share;
      busFactor += 1;
      if (covered >= 0.5) break;
    }

    const churn = acc.additions + acc.deletions;
    const recencyDays =
      (now - new Date(acc.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    const riskReasons: string[] = [];
    let riskScore = 0;

    if (acc.commits >= 10) {
      riskScore += 20;
      riskReasons.push("High change frequency");
    }
    if (churn >= 500) {
      riskScore += 20;
      riskReasons.push("High line churn");
    }
    if (recencyDays < 30 && acc.commits >= 3) {
      riskScore += 15;
      riskReasons.push("Recently active");
    }
    if (topShare >= 0.8 && acc.contributors.size >= 1 && acc.commits >= 5) {
      riskScore += 25;
      riskReasons.push("Concentrated ownership");
    }
    if (acc.contributors.size >= 5) {
      riskScore += 10;
      riskReasons.push("Many contributors (coordination risk)");
    }
    if (riskReasons.length === 0) {
      riskReasons.push("Stable change pattern");
    }

    result.push({
      path: acc.path,
      language: languageFromPath(acc.path),
      commits: acc.commits,
      contributors: acc.contributors.size,
      additions: acc.additions,
      deletions: acc.deletions,
      churn,
      firstSeen: acc.firstSeen,
      lastSeen: acc.lastSeen,
      ownership,
      busFactor: Math.max(1, busFactor),
      riskScore: Math.min(100, riskScore),
      riskReasons,
    });
  }

  return result.sort((a, b) => b.riskScore - a.riskScore || b.churn - a.churn);
}

export function computeDirectories(files: FileStats[]): DirectoryStats[] {
  const map = new Map<
    string,
    {
      path: string;
      commits: number;
      files: number;
      contributors: Set<string>;
      churn: number;
      additions: number;
      deletions: number;
    }
  >();

  for (const f of files) {
    const dir = parentDir(f.path);
    const parts = dir === "/" ? ["/"] : dir.split("/");
    let cur = "";
    for (let i = 0; i < parts.length; i++) {
      cur = i === 0 ? parts[0]! : `${cur}/${parts[i]}`;
      const pathKey = cur || "/";
      const acc = map.get(pathKey) ?? {
        path: pathKey,
        commits: 0,
        files: 0,
        contributors: new Set<string>(),
        churn: 0,
        additions: 0,
        deletions: 0,
      };
      acc.files += 1;
      acc.commits += f.commits;
      acc.churn += f.churn;
      acc.additions += f.additions;
      acc.deletions += f.deletions;
      for (const o of f.ownership) acc.contributors.add(o.contributorId);
      map.set(pathKey, acc);
    }
  }

  return [...map.values()]
    .map((d) => ({
      path: d.path,
      commits: d.commits,
      files: d.files,
      contributors: d.contributors.size,
      churn: d.churn,
      additions: d.additions,
      deletions: d.deletions,
    }))
    .sort((a, b) => b.churn - a.churn);
}

export function computeContributors(
  commits: CommitWithFiles[],
  fileStats: FileStats[]
): ContributorStats[] {
  const aliases = buildContributorAliasMap(commits);
  const ordered = [...commits].sort(
    (a, b) => new Date(a.authorDate).getTime() - new Date(b.authorDate).getTime()
  );

  type Acc = {
    id: string;
    name: string;
    email: string;
    aliases: string[];
    commits: number;
    additions: number;
    deletions: number;
    firstCommit: string;
    lastCommit: string;
    days: Set<string>;
    hourHistogram: number[];
    weekdayHistogram: number[];
    paths: Map<string, number>;
    languages: Map<string, number>;
  };

  const map = new Map<string, Acc>();

  for (const c of ordered) {
    const id = contributorId(c.authorName, c.authorEmail);
    const alias = aliases.get(id)!;
    let acc = map.get(id);
    if (!acc) {
      acc = {
        id,
        name: alias.name,
        email: alias.email,
        aliases: [...alias.aliases],
        commits: 0,
        additions: 0,
        deletions: 0,
        firstCommit: c.authorDate,
        lastCommit: c.authorDate,
        days: new Set(),
        hourHistogram: Array.from({ length: 24 }, () => 0),
        weekdayHistogram: Array.from({ length: 7 }, () => 0),
        paths: new Map(),
        languages: new Map(),
      };
      map.set(id, acc);
    }
    acc.commits += 1;
    acc.additions += c.additions;
    acc.deletions += c.deletions;
    acc.lastCommit = c.authorDate;
    acc.days.add(startOfDay(new Date(c.authorDate)));
    const d = new Date(c.authorDate);
    acc.hourHistogram[d.getUTCHours()]! += 1;
    acc.weekdayHistogram[d.getUTCDay()]! += 1;
    for (const f of c.files) {
      if (isIgnorablePath(f.path)) continue;
      const dir = parentDir(f.path);
      acc.paths.set(dir, (acc.paths.get(dir) ?? 0) + 1);
      const lang = languageFromPath(f.path);
      acc.languages.set(lang, (acc.languages.get(lang) ?? 0) + 1);
    }
  }

  // Collaboration: pair contributors who touched same files in overlapping windows
  const fileContributors = new Map<string, Set<string>>();
  for (const f of fileStats) {
    fileContributors.set(
      f.path,
      new Set(f.ownership.map((o) => o.contributorId))
    );
  }
  const collab = new Map<string, number>();
  for (const set of fileContributors.values()) {
    const ids = [...set];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]!;
        const b = ids[j]!;
        const key = a < b ? `${a}||${b}` : `${b}||${a}`;
        collab.set(key, (collab.get(key) ?? 0) + 1);
      }
    }
  }

  const totalCommits = commits.length || 1;
  const result: ContributorStats[] = [];
  for (const acc of map.values()) {
    const collaborators: { id: string; sharedCommits: number }[] = [];
    for (const [key, weight] of collab) {
      const [a, b] = key.split("||");
      if (a === acc.id) collaborators.push({ id: b!, sharedCommits: weight });
      if (b === acc.id) collaborators.push({ id: a!, sharedCommits: weight });
    }
    collaborators.sort((x, y) => y.sharedCommits - x.sharedCommits);

    result.push({
      id: acc.id,
      name: acc.name,
      email: acc.email,
      aliases: acc.aliases,
      commits: acc.commits,
      additions: acc.additions,
      deletions: acc.deletions,
      firstCommit: acc.firstCommit,
      lastCommit: acc.lastCommit,
      activeDays: acc.days.size,
      hourHistogram: acc.hourHistogram,
      weekdayHistogram: acc.weekdayHistogram,
      primaryPaths: [...acc.paths.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([path, commits]) => ({ path, commits })),
      languages: [...acc.languages.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([language, commits]) => ({ language, commits })),
      collaborators: collaborators.slice(0, 10),
      ownershipShare: acc.commits / totalCommits,
    });
  }

  return result.sort((a, b) => b.commits - a.commits);
}

export function computeLanguages(files: FileStats[]): LanguageSeries[] {
  const map = new Map<string, number>();
  for (const f of files) {
    map.set(f.language, (map.get(f.language) ?? 0) + 1);
  }
  const total = files.length || 1;
  return [...map.entries()]
    .map(([language, count]) => ({
      language,
      count,
      percent: count / total,
    }))
    .sort((a, b) => b.count - a.count);
}

export function computeCoChange(
  commits: CommitWithFiles[],
  maxNodes: number,
  maxEdges: number
): { nodes: string[]; edges: CoChangeEdge[] } {
  const pairWeights = new Map<string, number>();
  const nodeCounts = new Map<string, number>();

  for (const c of commits) {
    const paths = uniqueBy(
      c.files.filter((f) => !isIgnorablePath(f.path)).map((f) => f.path),
      (p) => p
    ).slice(0, 30);
    for (const p of paths) {
      nodeCounts.set(p, (nodeCounts.get(p) ?? 0) + 1);
    }
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const a = paths[i]!;
        const b = paths[j]!;
        const key = a < b ? `${a}||${b}` : `${b}||${a}`;
        pairWeights.set(key, (pairWeights.get(key) ?? 0) + 1);
      }
    }
  }

  const topNodes = [...nodeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxNodes)
    .map(([n]) => n);
  const nodeSet = new Set(topNodes);

  const edges = [...pairWeights.entries()]
    .map(([key, weight]) => {
      const [source, target] = key.split("||") as [string, string];
      return { source, target, weight };
    })
    .filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target) && e.weight >= 2)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxEdges);

  const used = new Set<string>();
  for (const e of edges) {
    used.add(e.source);
    used.add(e.target);
  }
  return { nodes: [...used], edges };
}

export function computeCollaboration(
  contributors: ContributorStats[],
  maxNodes: number,
  maxEdges: number
): { nodes: string[]; edges: CollaborationEdge[] } {
  const top = contributors.slice(0, maxNodes);
  const idSet = new Set(top.map((c) => c.id));
  const edgeMap = new Map<string, number>();
  for (const c of top) {
    for (const col of c.collaborators) {
      if (!idSet.has(col.id)) continue;
      const a = c.id;
      const b = col.id;
      const key = a < b ? `${a}||${b}` : `${b}||${a}`;
      edgeMap.set(key, Math.max(edgeMap.get(key) ?? 0, col.sharedCommits));
    }
  }
  const edges = [...edgeMap.entries()]
    .map(([key, weight]) => {
      const [source, target] = key.split("||") as [string, string];
      return { source, target, weight };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxEdges);
  return { nodes: top.map((c) => c.id), edges };
}

export function computeGrowth(commits: CommitWithFiles[]): GrowthPoint[] {
  const ordered = [...commits].sort(
    (a, b) => new Date(a.authorDate).getTime() - new Date(b.authorDate).getTime()
  );
  const alive = new Set<string>();
  let lines = 0;
  const byMonth = new Map<string, GrowthPoint>();

  let i = 0;
  for (const c of ordered) {
    i += 1;
    for (const f of c.files) {
      if (isIgnorablePath(f.path)) continue;
      if (f.status === "deleted") {
        alive.delete(f.path);
      } else {
        alive.add(f.path);
      }
      lines += f.additions - f.deletions;
      if (lines < 0) lines = 0;
    }
    const month = monthKey(c.authorDate);
    byMonth.set(month, {
      date: month,
      files: alive.size,
      lines,
      commits: i,
    });
  }
  return [...byMonth.values()];
}

export function detectBurstsAndQuiet(
  byDay: ActivityPoint[]
): {
  bursts: AnalysisResult["bursts"];
  quietPeriods: AnalysisResult["quietPeriods"];
} {
  if (byDay.length === 0) return { bursts: [], quietPeriods: [] };
  const avg =
    byDay.reduce((s, d) => s + d.commits, 0) / Math.max(1, byDay.length);
  const threshold = Math.max(3, avg * 2.5);

  const bursts: AnalysisResult["bursts"] = [];
  let burstStart: ActivityPoint | null = null;
  let burstCommits = 0;

  for (const d of byDay) {
    if (d.commits >= threshold) {
      if (!burstStart) burstStart = d;
      burstCommits += d.commits;
    } else if (burstStart) {
      bursts.push({
        start: burstStart.date,
        end: d.date,
        commits: burstCommits,
        description: `Activity burst with ${burstCommits} commits`,
      });
      burstStart = null;
      burstCommits = 0;
    }
  }

  const quietPeriods: AnalysisResult["quietPeriods"] = [];
  // Detect gaps between days > 14 days
  for (let i = 1; i < byDay.length; i++) {
    const prev = new Date(byDay[i - 1]!.date);
    const cur = new Date(byDay[i]!.date);
    const gap = Math.floor(
      (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (gap >= 14) {
      quietPeriods.push({
        start: byDay[i - 1]!.date,
        end: byDay[i]!.date,
        days: gap,
        description: `${gap}-day quiet period`,
      });
    }
  }

  return { bursts: bursts.slice(0, 20), quietPeriods: quietPeriods.slice(0, 20) };
}

export function detectLargeCommits(
  commits: CommitWithFiles[]
): AnalysisResult["largeCommits"] {
  return [...commits]
    .map((c) => ({
      hash: c.hash,
      date: c.authorDate,
      subject: c.subject,
      filesChanged: c.files.length,
      additions: c.additions,
      deletions: c.deletions,
    }))
    .filter((c) => c.filesChanged >= 20 || c.additions + c.deletions >= 1000)
    .sort(
      (a, b) =>
        b.filesChanged + b.additions + b.deletions -
        (a.filesChanged + a.additions + a.deletions)
    )
    .slice(0, 25);
}

export function computeReleases(
  commits: CommitWithFiles[],
  tags: TagInfo[]
): ReleaseInfo[] {
  if (tags.length === 0) return [];
  const orderedCommits = [...commits].sort(
    (a, b) => new Date(a.authorDate).getTime() - new Date(b.authorDate).getTime()
  );
  const hashToIndex = new Map(orderedCommits.map((c, i) => [c.hash, i]));

  const sortedTags = [...tags].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da && db) return da - db;
    const ia = hashToIndex.get(a.hash) ?? 0;
    const ib = hashToIndex.get(b.hash) ?? 0;
    return ia - ib;
  });

  const releases: ReleaseInfo[] = [];
  for (let i = 0; i < sortedTags.length; i++) {
    const tag = sortedTags[i]!;
    const prev = i > 0 ? sortedTags[i - 1] : undefined;
    const endIdx = hashToIndex.get(tag.hash) ?? orderedCommits.length - 1;
    const startIdx = prev ? (hashToIndex.get(prev.hash) ?? 0) + 1 : 0;
    const slice = orderedCommits.slice(
      Math.max(0, startIdx),
      Math.min(orderedCommits.length, endIdx + 1)
    );
    const categories = tallyCategories(slice);
    const contributors = [
      ...new Set(slice.map((c) => contributorId(c.authorName, c.authorEmail))),
    ];
    const highlights = slice
      .filter((c) => {
        const cat = categorizeCommit(c.subject, c.body);
        return cat === "feature" || cat === "fix";
      })
      .slice(0, 8)
      .map((c) => c.subject);

    releases.push({
      tag: tag.name,
      hash: tag.hash,
      date: tag.date ?? slice[slice.length - 1]?.authorDate ?? "",
      previousTag: prev?.name,
      commits: slice.length,
      contributors,
      categories,
      highlights,
    });
  }
  return releases.reverse(); // newest first
}

export function inferEras(
  commits: CommitWithFiles[],
  tags: TagInfo[],
  bursts: AnalysisResult["bursts"],
  contributors: ContributorStats[]
): Era[] {
  if (commits.length === 0) return [];
  const ordered = [...commits].sort(
    (a, b) => new Date(a.authorDate).getTime() - new Date(b.authorDate).getTime()
  );
  const first = ordered[0]!.authorDate;
  const last = ordered[ordered.length - 1]!.authorDate;

  // Split by major tags or into thirds
  const versionTags = tags
    .filter((t) => /v?\d+\.\d+/.test(t.name))
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

  const boundaries: { date: string; label: string }[] = [
    { date: first, label: "Founding" },
  ];
  for (const t of versionTags.slice(0, 6)) {
    if (t.date) boundaries.push({ date: t.date, label: t.name });
  }
  boundaries.push({ date: last, label: "Present" });

  // Dedupe close boundaries
  const eras: Era[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i]!.date;
    const end = boundaries[i + 1]!.date;
    const slice = ordered.filter((c) => {
      const t = new Date(c.authorDate).getTime();
      return t >= new Date(start).getTime() && t <= new Date(end).getTime();
    });
    if (slice.length === 0) continue;
    const counts = new Map<string, number>();
    for (const c of slice) {
      const id = contributorId(c.authorName, c.authorEmail);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => contributors.find((c) => c.id === id)?.name ?? id);

    const eraTags = tags
      .filter((t) => {
        if (!t.date) return false;
        const tms = new Date(t.date).getTime();
        return tms >= new Date(start).getTime() && tms <= new Date(end).getTime();
      })
      .map((t) => t.name);

    const burstHere = bursts.some(
      (b) =>
        new Date(b.start).getTime() >= new Date(start).getTime() &&
        new Date(b.start).getTime() <= new Date(end).getTime()
    );

    const name =
      i === 0
        ? "Founding era"
        : eraTags[0]
          ? `Era of ${eraTags[0]}`
          : `Development phase ${i + 1}`;

    eras.push({
      id: `era-${i}`,
      name,
      start: startOfDay(new Date(start)),
      end: startOfDay(new Date(end)),
      summary: burstHere
        ? `${slice.length} commits with notable activity bursts. Led by ${top[0] ?? "unknown"}.`
        : `${slice.length} commits. Primary contributors: ${top.join(", ") || "n/a"}.`,
      commitCount: slice.length,
      topContributors: top,
      tags: eraTags,
    });
  }

  // Fallback if only one boundary pair produced nothing useful
  if (eras.length === 0) {
    eras.push({
      id: "era-0",
      name: "Full history",
      start: startOfDay(new Date(first)),
      end: startOfDay(new Date(last)),
      summary: `${ordered.length} commits across the repository lifetime.`,
      commitCount: ordered.length,
      topContributors: contributors.slice(0, 3).map((c) => c.name),
      tags: tags.map((t) => t.name).slice(0, 5),
    });
  }
  return eras;
}

export function buildMilestones(
  first: string,
  tags: TagInfo[],
  bursts: AnalysisResult["bursts"],
  quiet: AnalysisResult["quietPeriods"],
  large: AnalysisResult["largeCommits"]
): Milestone[] {
  const milestones: Milestone[] = [
    {
      id: "founding",
      date: first,
      kind: "founding",
      title: "Repository founded",
      description: "First commit landed.",
    },
  ];
  for (const t of tags.slice(0, 15)) {
    milestones.push({
      id: `release-${t.name}`,
      date: t.date ?? first,
      kind: "release",
      title: `Release ${t.name}`,
      description: t.message || `Tag ${t.name} created.`,
      commitHash: t.hash,
      tag: t.name,
    });
  }
  for (const b of bursts.slice(0, 5)) {
    milestones.push({
      id: `burst-${b.start}`,
      date: b.start,
      kind: "burst",
      title: "Activity burst",
      description: b.description,
    });
  }
  for (const q of quiet.slice(0, 3)) {
    milestones.push({
      id: `quiet-${q.start}`,
      date: q.start,
      kind: "quiet",
      title: "Quiet period",
      description: q.description,
    });
  }
  for (const lc of large.slice(0, 5)) {
    const isMigration =
      lc.filesChanged >= 40 ||
      /migrat|rewrite|rename|move|restructure/i.test(lc.subject);
    milestones.push({
      id: `large-${lc.hash.slice(0, 7)}`,
      date: lc.date,
      kind: isMigration ? "migration" : "rewrite",
      title: isMigration ? "Likely migration" : "Large change",
      description: lc.subject,
      commitHash: lc.hash,
    });
  }
  return milestones.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function buildNarrative(
  overview: {
    name: string;
    commitCount: number;
    contributorCount: number;
    ageDays: number;
    fileCount: number;
  },
  topContributors: string[],
  eras: Era[],
  languages: LanguageSeries[]
): string {
  const lang = languages[0]?.language ?? "multiple languages";
  const lead = topContributors[0] ?? "a small team";
  const eraNote =
    eras.length > 1
      ? `History spans ${eras.length} development eras, from “${eras[0]!.name}” to “${eras[eras.length - 1]!.name}”.`
      : `Development has been relatively continuous.`;
  return (
    `${overview.name} is approximately ${overview.ageDays} days old with ` +
    `${overview.commitCount} commits from ${overview.contributorCount} contributors ` +
    `across roughly ${overview.fileCount} files. Primary language signal: ${lang}. ` +
    `Most active contributor: ${lead}. ${eraNote}`
  );
}

export function buildTimeline(
  commits: CommitWithFiles[],
  maxSamples: number
): TimelineSample[] {
  if (commits.length === 0) return [];
  const ordered = [...commits].sort(
    (a, b) => new Date(a.authorDate).getTime() - new Date(b.authorDate).getTime()
  );
  const step = Math.max(1, Math.floor(ordered.length / maxSamples));
  const samples: TimelineSample[] = [];
  const alive = new Set<string>();
  const contributors = new Set<string>();

  for (let i = 0; i < ordered.length; i++) {
    const c = ordered[i]!;
    let created = 0;
    let deleted = 0;
    let modified = 0;
    for (const f of c.files) {
      if (isIgnorablePath(f.path)) continue;
      if (f.status === "deleted") {
        deleted += 1;
        alive.delete(f.path);
      } else if (f.status === "added" || (!alive.has(f.path) && f.deletions === 0)) {
        created += 1;
        alive.add(f.path);
      } else {
        modified += 1;
        alive.add(f.path);
      }
    }
    contributors.add(contributorId(c.authorName, c.authorEmail));

    if (i % step === 0 || i === ordered.length - 1) {
      // simplified tree: top-level dirs + sample files
      const dirs = new Set<string>();
      const fileSample: string[] = [];
      for (const p of alive) {
        const top = p.split("/")[0] ?? p;
        dirs.add(top);
        if (fileSample.length < 12) fileSample.push(p);
      }
      const tree: TimelineSample["tree"] = [
        ...[...dirs].slice(0, 16).map((path) => ({
          path,
          kind: "dir" as const,
        })),
        ...fileSample.map((path) => ({
          path,
          kind: "file" as const,
          status: "present",
        })),
      ];

      samples.push({
        index: samples.length,
        hash: c.hash,
        date: c.authorDate,
        subject: c.subject,
        author: c.authorName,
        filesCreated: created,
        filesDeleted: deleted,
        filesModified: modified,
        activeContributors: [...contributors].slice(-8),
        cumulativeFiles: alive.size,
        cumulativeCommits: i + 1,
        tree,
      });
    }
  }
  return samples;
}

export function buildStory(
  repositoryName: string,
  overview: AnalysisResult["overview"],
  eras: Era[],
  milestones: Milestone[],
  contributors: ContributorStats[],
  releases: ReleaseInfo[]
): StorySlide[] {
  const slides: StorySlide[] = [
    {
      id: "intro",
      date: overview.firstCommit,
      title: `The story of ${repositoryName}`,
      body: overview.narrative,
      kind: "summary",
      metrics: {
        Commits: overview.commitCount,
        Contributors: overview.contributorCount,
        Files: overview.fileCount,
        "Age (days)": overview.ageDays,
      },
    },
  ];

  for (const era of eras) {
    slides.push({
      id: era.id,
      date: era.start,
      title: era.name,
      body: era.summary,
      kind: "era",
      metrics: {
        Commits: era.commitCount,
        From: era.start,
        To: era.end,
      },
    });
  }

  for (const m of milestones.filter((x) => x.kind === "release").slice(0, 8)) {
    slides.push({
      id: m.id,
      date: m.date,
      title: m.title,
      body: m.description,
      kind: "release",
    });
  }

  for (const c of contributors.slice(0, 5)) {
    slides.push({
      id: `person-${c.id}`,
      date: c.firstCommit,
      title: c.name,
      body: `${c.commits} commits from ${c.firstCommit.slice(0, 10)} to ${c.lastCommit.slice(0, 10)}. Primary paths: ${c.primaryPaths
        .slice(0, 3)
        .map((p) => p.path)
        .join(", ") || "—"}.`,
      kind: "contributor",
      metrics: {
        Commits: c.commits,
        "Active days": c.activeDays,
      },
    });
  }

  for (const m of milestones.filter(
    (x) => x.kind === "burst" || x.kind === "migration" || x.kind === "rewrite"
  ).slice(0, 6)) {
    slides.push({
      id: m.id,
      date: m.date,
      title: m.title,
      body: m.description,
      kind: "event",
    });
  }

  if (releases[0]) {
    slides.push({
      id: "latest-release",
      date: releases[0].date,
      title: `Latest release: ${releases[0].tag}`,
      body: `${releases[0].commits} commits · ${releases[0].highlights.slice(0, 3).join("; ") || "See release notes."}`,
      kind: "release",
    });
  }

  slides.push({
    id: "outro",
    date: overview.lastCommit,
    title: "Where it stands today",
    body: `${repositoryName} continues with ${overview.contributorCount} known contributors and ${overview.tagCount} tags. Explore Time Machine, Hotspots, and Graphs for deeper detail.`,
    kind: "summary",
  });

  return slides;
}

export function analyzeRepository(input: AnalyzeInput): AnalysisResult {
  const limits = {
    maxGraphNodes: input.limits?.maxGraphNodes ?? 80,
    maxGraphEdges: input.limits?.maxGraphEdges ?? 200,
    maxTimelineSamples: input.limits?.maxTimelineSamples ?? 200,
    maxHotspots: input.limits?.maxHotspots ?? 50,
  };

  const commits = input.commits;
  const tags = input.tags;
  const activity = computeActivity(commits);
  const files = computeFileStats(commits);
  const directories = computeDirectories(files);
  const contributors = computeContributors(commits, files);
  const languages = computeLanguages(files);
  const growth = computeGrowth(commits);
  const { bursts, quietPeriods } = detectBurstsAndQuiet(activity.byDay);
  const largeCommits = detectLargeCommits(commits);
  const releases = computeReleases(commits, tags);
  const eras = inferEras(commits, tags, bursts, contributors);
  const categories = tallyCategories(commits);

  const ordered = [...commits].sort(
    (a, b) => new Date(a.authorDate).getTime() - new Date(b.authorDate).getTime()
  );
  const firstCommit = ordered[0]?.authorDate ?? new Date().toISOString();
  const lastCommit =
    ordered[ordered.length - 1]?.authorDate ?? new Date().toISOString();
  const ageDays = Math.max(
    0,
    Math.floor(
      (new Date(lastCommit).getTime() - new Date(firstCommit).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const activeDays = activity.byDay.filter((d) => d.commits > 0).length;
  const fileCount = files.length;
  const totalAdditions = commits.reduce((s, c) => s + c.additions, 0);
  const totalDeletions = commits.reduce((s, c) => s + c.deletions, 0);

  const overviewBase = {
    name: input.repository.name,
    commitCount: commits.length,
    contributorCount: contributors.length,
    ageDays,
    fileCount,
  };

  const narrative = buildNarrative(
    overviewBase,
    contributors.map((c) => c.name),
    eras,
    languages
  );

  const milestones = buildMilestones(
    firstCommit,
    tags,
    bursts,
    quietPeriods,
    largeCommits
  );

  const coChange = computeCoChange(
    commits,
    limits.maxGraphNodes,
    limits.maxGraphEdges
  );
  const collaboration = computeCollaboration(
    contributors,
    Math.min(limits.maxGraphNodes, 40),
    limits.maxGraphEdges
  );
  const timeline = buildTimeline(commits, limits.maxTimelineSamples);

  const overview: AnalysisResult["overview"] = {
    firstCommit,
    lastCommit,
    ageDays,
    commitCount: commits.length,
    contributorCount: contributors.length,
    fileCount,
    activeDays,
    tagCount: tags.length,
    totalAdditions,
    totalDeletions,
    narrative,
  };

  const story = buildStory(
    input.repository.name,
    overview,
    eras,
    milestones,
    contributors,
    releases
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    repository: input.repository,
    overview,
    activity,
    languages,
    contributors,
    files,
    directories,
    hotspots: files.slice(0, limits.maxHotspots),
    growth,
    eras,
    milestones,
    coChange,
    collaboration,
    releases,
    categories,
    timeline,
    story,
    bursts,
    quietPeriods,
    largeCommits,
  };
}

// re-export for tests
export { categorizeCommit, tallyCategories, groupBy };
export type { CategoryCount };
