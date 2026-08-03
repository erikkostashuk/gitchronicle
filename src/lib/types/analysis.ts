/** Domain types for the analysis pipeline and persisted results. */

export interface RawCommit {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  authorDate: string; // ISO
  committerName: string;
  committerEmail: string;
  committerDate: string;
  subject: string;
  body: string;
  parents: string[];
}

export interface FileChange {
  path: string;
  previousPath?: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied" | "unknown";
  additions: number;
  deletions: number;
}

export interface CommitWithFiles extends RawCommit {
  files: FileChange[];
  additions: number;
  deletions: number;
}

export interface TagInfo {
  name: string;
  hash: string;
  date?: string;
  message?: string;
}

export interface ContributorStats {
  id: string;
  name: string;
  email: string;
  aliases: string[];
  commits: number;
  additions: number;
  deletions: number;
  firstCommit: string;
  lastCommit: string;
  activeDays: number;
  hourHistogram: number[]; // 24
  weekdayHistogram: number[]; // 7 (Sun=0)
  primaryPaths: { path: string; commits: number }[];
  languages: { language: string; commits: number }[];
  collaborators: { id: string; sharedCommits: number }[];
  ownershipShare: number;
}

export interface FileStats {
  path: string;
  language: string;
  commits: number;
  contributors: number;
  additions: number;
  deletions: number;
  churn: number;
  firstSeen: string;
  lastSeen: string;
  ownership: { contributorId: string; commits: number; share: number }[];
  busFactor: number;
  riskScore: number;
  riskReasons: string[];
}

export interface DirectoryStats {
  path: string;
  commits: number;
  files: number;
  contributors: number;
  churn: number;
  additions: number;
  deletions: number;
}

export interface ActivityPoint {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
  contributors: number;
}

export interface HeatmapCell {
  date: string;
  count: number;
}

export interface LanguageSeries {
  language: string;
  count: number;
  percent: number;
}

export interface GrowthPoint {
  date: string;
  files: number;
  lines: number;
  commits: number;
}

export interface Era {
  id: string;
  name: string;
  start: string;
  end: string;
  summary: string;
  commitCount: number;
  topContributors: string[];
  tags: string[];
}

export interface Milestone {
  id: string;
  date: string;
  kind: "release" | "burst" | "rewrite" | "quiet" | "founding" | "migration";
  title: string;
  description: string;
  commitHash?: string;
  tag?: string;
}

export interface CoChangeEdge {
  source: string;
  target: string;
  weight: number;
}

export interface CollaborationEdge {
  source: string;
  target: string;
  weight: number;
}

export interface CategoryCount {
  category:
    | "feature"
    | "fix"
    | "refactor"
    | "docs"
    | "test"
    | "build"
    | "chore"
    | "other";
  count: number;
}

export interface ReleaseInfo {
  tag: string;
  hash: string;
  date: string;
  previousTag?: string;
  commits: number;
  contributors: string[];
  categories: CategoryCount[];
  highlights: string[];
}

export interface TimelineSample {
  index: number;
  hash: string;
  date: string;
  subject: string;
  author: string;
  filesCreated: number;
  filesDeleted: number;
  filesModified: number;
  activeContributors: string[];
  cumulativeFiles: number;
  cumulativeCommits: number;
  tree: { path: string; kind: "file" | "dir"; status?: string }[];
}

export interface StorySlide {
  id: string;
  date: string;
  title: string;
  body: string;
  kind: "era" | "release" | "contributor" | "event" | "summary";
  metrics?: Record<string, string | number>;
}

export interface AnalysisResult {
  version: 1;
  generatedAt: string;
  repository: {
    name: string;
    fullName?: string;
    url?: string;
    defaultBranch?: string;
    description?: string;
  };
  overview: {
    firstCommit: string;
    lastCommit: string;
    ageDays: number;
    commitCount: number;
    contributorCount: number;
    fileCount: number;
    activeDays: number;
    tagCount: number;
    totalAdditions: number;
    totalDeletions: number;
    narrative: string;
  };
  activity: {
    byDay: ActivityPoint[];
    byWeek: ActivityPoint[];
    byMonth: ActivityPoint[];
    heatmap: HeatmapCell[];
    hourHistogram: number[];
    weekdayHistogram: number[];
  };
  languages: LanguageSeries[];
  contributors: ContributorStats[];
  files: FileStats[];
  directories: DirectoryStats[];
  hotspots: FileStats[];
  growth: GrowthPoint[];
  eras: Era[];
  milestones: Milestone[];
  coChange: { nodes: string[]; edges: CoChangeEdge[] };
  collaboration: { nodes: string[]; edges: CollaborationEdge[] };
  releases: ReleaseInfo[];
  categories: CategoryCount[];
  timeline: TimelineSample[];
  story: StorySlide[];
  bursts: { start: string; end: string; commits: number; description: string }[];
  quietPeriods: {
    start: string;
    end: string;
    days: number;
    description: string;
  }[];
  largeCommits: {
    hash: string;
    date: string;
    subject: string;
    filesChanged: number;
    additions: number;
    deletions: number;
  }[];
}
