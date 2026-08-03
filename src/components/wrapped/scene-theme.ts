/**
 * Scene theming for the Wrapped story.
 *
 * The product is light-first: most scenes are warm paper with a saturated
 * accent, punctuated by a few deliberately dark beats for contrast. Every
 * theme declares its own ink so text contrast is never left to chance.
 */
import type { WrappedPalette, WrappedSceneType } from "@/lib/wrapped";

export interface SceneTheme {
  mode: "light" | "dark";
  /** Page-filling background (solid or gradient) */
  surface: string;
  /** Primary text colour on that surface */
  ink: string;
  /** Secondary text — always ≥4.5:1 on the surface */
  inkSoft: string;
  /** Hairline / rule colour */
  rule: string;
  /** Saturated accent used for numerals, bars and fields */
  accent: string;
  /** Readable text colour when sitting *on* the accent */
  onAccent: string;
  /** Ambient blob tint */
  ambient: string;
  /** Chip / inset surface */
  inset: string;
}

const PAPER = "#fbf7f1";
const INK = "#16130f";

export const SCENE_THEMES: Record<WrappedPalette, SceneTheme> = {
  /** Paper + cobalt — the house style */
  aurora: {
    mode: "light",
    surface: "linear-gradient(160deg,#fdfbf7 0%,#f4eee3 55%,#e9e4f6 100%)",
    ink: INK,
    inkSoft: "#5b5346",
    rule: "#ddd3c2",
    accent: "#2447f0",
    onAccent: "#ffffff",
    ambient: "rgba(36,71,240,0.14)",
    inset: "rgba(22,19,15,0.05)",
  },
  /** Full coral field — the loudest light scene */
  ember: {
    mode: "light",
    surface: "linear-gradient(150deg,#ff6a45 0%,#ff4d2e 48%,#ee3a2a 100%)",
    ink: "#2a0d05",
    inkSoft: "rgba(42,13,5,0.72)",
    rule: "rgba(42,13,5,0.22)",
    accent: "#fff3ec",
    onAccent: "#2a0d05",
    ambient: "rgba(255,214,196,0.35)",
    inset: "rgba(42,13,5,0.1)",
  },
  /** Ink night — contrast beat */
  midnight: {
    mode: "dark",
    surface: "linear-gradient(165deg,#191510 0%,#121016 55%,#0b1220 100%)",
    ink: "#f9f5ec",
    inkSoft: "rgba(249,245,236,0.68)",
    rule: "rgba(249,245,236,0.18)",
    accent: "#c9f03a",
    onAccent: "#16130f",
    ambient: "rgba(201,240,58,0.16)",
    inset: "rgba(249,245,236,0.08)",
  },
  /** Lime field — high-energy light scene */
  forest: {
    mode: "light",
    surface: "linear-gradient(155deg,#dcf75f 0%,#c9f03a 50%,#a7d81f 100%)",
    ink: "#17200a",
    inkSoft: "rgba(23,32,10,0.7)",
    rule: "rgba(23,32,10,0.2)",
    accent: "#16130f",
    onAccent: "#c9f03a",
    ambient: "rgba(23,32,10,0.1)",
    inset: "rgba(23,32,10,0.09)",
  },
  /** Deep plum — the second dark beat */
  violet: {
    mode: "dark",
    surface: "linear-gradient(160deg,#2b1163 0%,#3d1a86 45%,#1a0f3d 100%)",
    ink: "#f6f1ff",
    inkSoft: "rgba(246,241,255,0.7)",
    rule: "rgba(246,241,255,0.2)",
    accent: "#ffb020",
    onAccent: "#2a1400",
    ambient: "rgba(255,176,32,0.16)",
    inset: "rgba(246,241,255,0.09)",
  },
  /** Charcoal — quiet, typographic */
  slate: {
    mode: "dark",
    surface: "linear-gradient(170deg,#232019 0%,#191713 60%,#14120e 100%)",
    ink: "#f4efe4",
    inkSoft: "rgba(244,239,228,0.66)",
    rule: "rgba(244,239,228,0.16)",
    accent: "#ff7a5c",
    onAccent: "#2a0d05",
    ambient: "rgba(255,122,92,0.14)",
    inset: "rgba(244,239,228,0.07)",
  },
  /** Paper + teal */
  ocean: {
    mode: "light",
    surface: "linear-gradient(160deg,#f4fbf9 0%,#e3f4ef 55%,#f7f2e6 100%)",
    ink: "#0d1f1c",
    inkSoft: "#4a5c58",
    rule: "#cfe3dd",
    accent: "#0b7f72",
    onAccent: "#ffffff",
    ambient: "rgba(14,159,142,0.16)",
    inset: "rgba(13,31,28,0.05)",
  },
  /** Amber field */
  gold: {
    mode: "light",
    surface: "linear-gradient(155deg,#ffd77a 0%,#ffb020 52%,#f0940c 100%)",
    ink: "#2b1a00",
    inkSoft: "rgba(43,26,0,0.7)",
    rule: "rgba(43,26,0,0.2)",
    accent: "#2447f0",
    onAccent: "#ffffff",
    ambient: "rgba(255,247,224,0.4)",
    inset: "rgba(43,26,0,0.1)",
  },
};

export function sceneTheme(palette: WrappedPalette): SceneTheme {
  return SCENE_THEMES[palette] ?? SCENE_THEMES.aurora;
}

/** Fallback for `light-dark`-ish inline styles that need the paper token. */
export const SCENE_PAPER = PAPER;

/**
 * Entrance choreography. Consecutive scenes must not share a transition, so
 * the variant is derived from the scene index *and* biased by scene type —
 * a headline crashes in, a recap tilts up, a closing wipes.
 */
export type SceneTransition =
  | "rise"
  | "wipe"
  | "zoom"
  | "left"
  | "tilt"
  | "drop";

const TYPE_TRANSITION: Partial<Record<WrappedSceneType, SceneTransition>> = {
  opening: "zoom",
  headline: "wipe",
  busiest: "drop",
  rhythm: "zoom",
  streak: "left",
  people: "rise",
  main_character: "tilt",
  rising_star: "rise",
  favorites: "wipe",
  personality: "zoom",
  recap: "tilt",
  closing: "wipe",
};

const CYCLE: SceneTransition[] = ["rise", "left", "wipe", "tilt", "zoom", "drop"];

export function sceneTransition(
  type: WrappedSceneType,
  index: number,
  direction: "forward" | "back"
): string {
  if (direction === "back") return "gc-in-right";
  const variant = TYPE_TRANSITION[type] ?? CYCLE[index % CYCLE.length]!;
  switch (variant) {
    case "wipe":
      return "gc-in-wipe";
    case "zoom":
      return "gc-in-zoom";
    case "left":
      return "gc-in-left";
    case "tilt":
      return "gc-in-tilt";
    case "drop":
      return "gc-in-drop";
    default:
      return "gc-in-rise";
  }
}
