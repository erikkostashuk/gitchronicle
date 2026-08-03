import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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
  const m = block.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`));
  return m?.[1]?.trim() ?? null;
}

describe("Spotify-like light theme tokens (shipped CSS)", () => {
  const css = readSrc("app/globals.css");

  it("sets light :root surfaces and near-black text", () => {
    const bg = cssVar(css, ":root", "--background");
    const fg = cssVar(css, ":root", "--foreground");
    const card = cssVar(css, ":root", "--card");

    expect(bg).toBeTruthy();
    expect(fg).toBeTruthy();
    expect(card).toBeTruthy();

    // Near-white / light gray backgrounds (not dark shell)
    expect(bg!.toLowerCase()).toMatch(/^#f[0-9a-f]{5}$|^#fff(?:fff)?$/i);
    expect(card!.toLowerCase()).toMatch(/^#fff(?:fff)?$/i);

    // High-contrast near-black foreground
    const hex = fg!.replace("#", "");
    const n = parseInt(hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex, 16);
    expect(n).toBeLessThan(0x333333);
  });

  it("uses Spotify-green family primary on light tokens", () => {
    const primary = cssVar(css, ":root", "--primary")!.toLowerCase();
    const ring = cssVar(css, ":root", "--ring")!.toLowerCase();
    const chart1 = cssVar(css, ":root", "--chart-1")!.toLowerCase();

    // #1DB954 / #1ED760 family — vivid green, not teal/indigo
    const spotifyFamily = /^#(1db954|1ed760)$/;
    expect(primary).toMatch(spotifyFamily);
    expect(ring).toMatch(spotifyFamily);
    expect(chart1).toMatch(spotifyFamily);

    // Explicitly not the previous teal primary
    expect(primary).not.toBe("#0d9488");
    expect(primary).not.toBe("#2dd4bf");
  });

  it("keeps multi-series chart colors distinct from brand green", () => {
    const chart1 = cssVar(css, ":root", "--chart-1")!.toLowerCase();
    const chart2 = cssVar(css, ":root", "--chart-2")!.toLowerCase();
    const chart3 = cssVar(css, ":root", "--chart-3")!.toLowerCase();
    // chart-2 must not be a near-identical green (was #1ed760 next to #1db954)
    expect(chart2).not.toBe(chart1);
    expect(chart2).not.toMatch(/^#(1db954|1ed760)$/);
    expect(chart3).not.toBe(chart1);
    expect(chart3).not.toBe(chart2);
  });

  it("keeps optional dark tokens with green primary (not product default)", () => {
    const darkPrimary = cssVar(css, ".dark", "--primary")!.toLowerCase();
    expect(darkPrimary).toMatch(/^#(1db954|1ed760)$/);
  });
});

describe("dashboard chart theme helpers (shipped)", () => {
  it("binds tooltip and axis colors to CSS variables", () => {
    const theme = readSrc("components/charts/theme.ts");
    expect(theme).toMatch(/muted-foreground/);
    expect(theme).toMatch(/popover-foreground/);
    expect(theme).toMatch(/--popover/);
    expect(theme).toMatch(/--border/);
  });

  it("activity and growth charts use shared theme + empty states", () => {
    const activity = readSrc("components/charts/activity-chart.tsx");
    const growth = readSrc("components/charts/growth-chart.tsx");
    expect(activity).toMatch(/from "\.\/theme"/);
    expect(growth).toMatch(/from "\.\/theme"/);
    expect(activity).toMatch(/No activity data/);
    expect(growth).toMatch(/No growth series/);
    expect(growth).toMatch(/Legend/);
  });
});

describe("theme provider default (shipped)", () => {
  it("defaults to light and does not force system-dark as product default", () => {
    const src = readSrc("components/theme-provider.tsx");
    expect(src).toMatch(/defaultTheme\s*=\s*["']light["']/);
    expect(src).not.toMatch(/defaultTheme\s*=\s*["']dark["']/);
    // System preference must not be the product default path
    expect(src).toMatch(/enableSystem\s*=\s*\{\s*false\s*\}/);
  });
});

describe("Spotify-adjacent chrome (shipped classes)", () => {
  it("uses pill primary buttons", () => {
    const button = readSrc("components/ui/button.tsx");
    expect(button).toContain("rounded-full");
    expect(button).toMatch(/bg-primary/);
  });

  it("uses solid green active nav pills", () => {
    const nav = readSrc("components/dashboard/nav.tsx");
    expect(nav).toContain("rounded-full");
    expect(nav).toMatch(/bg-primary\s+text-primary-foreground/);
  });

  it("landing hero uses green accent text without teal/indigo gradients", () => {
    const page = readSrc("app/page.tsx");
    expect(page).not.toMatch(/from-teal|to-indigo|teal-500|indigo-500/);
    expect(page).toMatch(/text-primary/);
    expect(page).toMatch(/font-extrabold|font-bold/);
  });

  it("site header uses green primary brand mark", () => {
    const header = readSrc("components/site-header.tsx");
    expect(header).toMatch(/bg-primary/);
    expect(header).toMatch(/rounded-full/);
  });
});
