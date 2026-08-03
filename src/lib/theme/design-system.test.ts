import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCENE_THEMES,
  sceneTheme,
  sceneTransition,
} from "@/components/wrapped/scene-theme";
import type { WrappedSceneType } from "@/lib/wrapped/types";

const root = path.resolve(__dirname, "../../..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, "src", rel), "utf8");
}

/** Extract a CSS custom property from a block (e.g. :root or .dark). */
function cssVar(css: string, blockSelector: string, name: string): string | null {
  const blockRe = new RegExp(
    `${blockSelector.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\n\\}`,
    "m"
  );
  const block = css.match(blockRe)?.[1];
  if (!block) return null;
  const m = block.match(
    new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`)
  );
  return m?.[1]?.trim() ?? null;
}

function hexLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
}

function contrast(a: string, b: string): number {
  const la = hexLuminance(a);
  const lb = hexLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe("light-first design tokens (shipped CSS)", () => {
  const css = readSrc("app/globals.css");

  it("uses a warm paper surface and near-black ink as the product default", () => {
    const bg = cssVar(css, ":root", "--background")!;
    const fg = cssVar(css, ":root", "--foreground")!;
    const paper = cssVar(css, ":root", "--paper")!;
    const ink = cssVar(css, ":root", "--ink")!;

    expect(bg).toBe("var(--paper)");
    expect(fg).toBe("var(--ink)");

    // Warm off-white, not pure white and not a dark shell
    expect(hexLuminance(paper)).toBeGreaterThan(0.85);
    expect(paper.toLowerCase()).not.toBe("#ffffff");
    // Near-black ink with strong contrast on paper
    expect(hexLuminance(ink)).toBeLessThan(0.05);
    expect(contrast(paper, ink)).toBeGreaterThan(15);
  });

  it("does not ship a copied streaming-brand green as the identity", () => {
    const lower = css.toLowerCase();
    expect(lower).not.toContain("#1db954");
    expect(lower).not.toContain("#1ed760");
  });

  it("keeps every chart hue distinct and readable on paper", () => {
    const paper = cssVar(css, ":root", "--paper")!;
    const hues = [1, 2, 3, 4, 5, 6].map(
      (i) => cssVar(css, ":root", `--chart-${i}`)!
    );
    expect(new Set(hues).size).toBe(hues.length);
    // Series may be declared directly or aliased to a palette variable
    const resolved = hues.map((h) =>
      h.startsWith("#") ? h : cssVar(css, ":root", h.slice(4, -1))!
    );
    for (const hex of resolved) {
      expect(contrast(paper, hex)).toBeGreaterThan(2.4);
    }
  });

  it("ships a motion system with several distinct entrances", () => {
    for (const name of [
      "gc-in-rise",
      "gc-in-drop",
      "gc-in-left",
      "gc-in-zoom",
      "gc-in-tilt",
      "gc-in-wipe",
    ]) {
      expect(css).toContain(`.${name}`);
    }
    // Ambient + staggered reveal primitives
    expect(css).toContain(".gc-stagger");
    expect(css).toContain(".gc-drift-a");
    expect(css).toContain(".gc-marquee-track");
  });

  it("neutralises motion globally under prefers-reduced-motion", () => {
    const block = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\n\}/m
    )?.[1];
    expect(block).toBeTruthy();
    expect(block).toMatch(/animation-duration:\s*0\.001ms\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0\.001ms\s*!important/);
    // End states must survive, not vanish
    expect(block).toMatch(/scaleX\(1\)/);
  });
});

describe("Wrapped scene themes", () => {
  it("is light-first with a few deliberate dark beats", () => {
    const modes = Object.values(SCENE_THEMES).map((t) => t.mode);
    const dark = modes.filter((m) => m === "dark").length;
    expect(modes.length).toBeGreaterThanOrEqual(8);
    expect(dark).toBeGreaterThanOrEqual(2);
    expect(dark).toBeLessThan(modes.length / 2);
  });

  it("declares readable ink and on-accent colours for every palette", () => {
    for (const [name, theme] of Object.entries(SCENE_THEMES)) {
      expect(theme.ink, name).toMatch(/^#|rgba?\(/);
      expect(theme.onAccent, name).toMatch(/^#|rgba?\(/);
      expect(theme.accent, name).toMatch(/^#/);
      // Text on the accent field must be legible
      expect(contrast(theme.accent, theme.onAccent), name).toBeGreaterThan(3);
    }
  });

  it("falls back to a valid theme for unknown palettes", () => {
    expect(sceneTheme("aurora")).toBe(SCENE_THEMES.aurora);
  });
});

describe("scene transitions", () => {
  it("varies the entrance rather than repeating one fade", () => {
    const types: WrappedSceneType[] = [
      "opening",
      "beginning",
      "headline",
      "busiest",
      "streak",
      "people",
    ];
    const classes = types.map((t, i) => sceneTransition(t, i, "forward"));
    expect(new Set(classes).size).toBeGreaterThanOrEqual(4);
    for (const c of classes) expect(c).toMatch(/^gc-in-/);
  });

  it("reverses direction when stepping back", () => {
    expect(sceneTransition("headline", 2, "back")).toBe("gc-in-right");
  });
});

describe("chart + chrome vocabulary (shipped)", () => {
  it("binds chart chrome to theme variables", () => {
    const theme = readSrc("components/charts/theme.ts");
    expect(theme).toMatch(/muted-foreground/);
    expect(theme).toMatch(/popover-foreground/);
    expect(theme).toMatch(/--popover/);
    expect(theme).toMatch(/--border/);
    expect(theme).toMatch(/chartCursorStyle/);
  });

  it("charts share the theme and ship real empty states", () => {
    const activity = readSrc("components/charts/activity-chart.tsx");
    const growth = readSrc("components/charts/growth-chart.tsx");
    expect(activity).toMatch(/from "\.\/theme"/);
    expect(growth).toMatch(/from "\.\/theme"/);
    expect(activity).toMatch(/No activity data/);
    expect(growth).toMatch(/No growth series/);
    expect(growth).toMatch(/Legend/);
  });

  it("defaults to light and never silently follows system dark", () => {
    const src = readSrc("components/theme-provider.tsx");
    expect(src).toMatch(/defaultTheme\s*=\s*["']light["']/);
    expect(src).not.toMatch(/defaultTheme\s*=\s*["']dark["']/);
    expect(src).toMatch(/enableSystem\s*=\s*\{\s*false\s*\}/);
  });

  it("uses the editorial button and panel vocabulary", () => {
    const button = readSrc("components/ui/button.tsx");
    expect(button).toContain("rounded-full");
    expect(button).toContain("gc-press");
    expect(button).toMatch(/accent:/);

    const card = readSrc("components/ui/card.tsx");
    expect(card).toContain("gc-card");
    expect(card).not.toContain("shadow-sm");
  });

  it("landing leads with display type and the coral accent", () => {
    const page = readSrc("app/page.tsx");
    expect(page).toMatch(/gc-display/);
    expect(page).toMatch(/gc-underline/);
    expect(page).toMatch(/--coral/);
    expect(page).not.toMatch(/text-primary\b/);
  });
});
