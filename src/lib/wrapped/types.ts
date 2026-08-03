/** Typed Wrapped scene model — pure data, no React. */

export type WrappedSceneType =
  | "opening"
  | "beginning"
  | "headline"
  | "busiest"
  | "commit_personality"
  | "rhythm"
  | "streak"
  | "people"
  | "main_character"
  | "rising_star"
  | "busiest_file"
  | "dramatic_file"
  | "favorites"
  | "architecture"
  | "giant_commit"
  | "releases"
  | "plot_twist"
  | "collaboration"
  | "cochange"
  | "personality"
  | "recap"
  | "closing";

export type WrappedPalette =
  | "aurora"
  | "ember"
  | "midnight"
  | "forest"
  | "violet"
  | "slate"
  | "ocean"
  | "gold";

export interface WrappedShareCard {
  kind:
    | "recap"
    | "personality"
    | "top_contributor"
    | "rising_star"
    | "busiest"
    | "streak"
    | "language"
    | "dramatic_file";
  headline: string;
  stat: string;
  detail: string;
  repoName: string;
}

export interface WrappedScene {
  id: string;
  type: WrappedSceneType;
  title: string;
  subtitle: string;
  /** Short playful kicker above the title */
  kicker?: string;
  body?: string;
  /** Large display number or short string */
  hero?: string | number;
  heroLabel?: string;
  metrics?: { label: string; value: string | number }[];
  chips?: string[];
  list?: { label: string; value?: string | number; hint?: string }[];
  bars?: { label: string; value: number; max: number }[];
  palette: WrappedPalette;
  share?: WrappedShareCard;
  /** Screen-reader summary */
  a11y: string;
}

export interface RepositoryPersonality {
  id: string;
  label: string;
  blurb: string;
  /** Why this personality was chosen (deterministic rules) */
  reasons: string[];
}

export interface StreakInfo {
  longestActiveDays: number;
  longestActiveStart: string | null;
  longestActiveEnd: string | null;
  longestQuietDays: number;
  longestQuietStart: string | null;
  longestQuietEnd: string | null;
}

export interface WrappedStory {
  version: 1;
  generatedAt: string;
  repositoryName: string;
  personality: RepositoryPersonality;
  streaks: StreakInfo;
  scenes: WrappedScene[];
  shareCards: WrappedShareCard[];
}
