import { describe, expect, it } from "vitest";
import { generateDemoAnalysis } from "../demo/generate";
import { analyzeRepository } from "../analysis/metrics";
import type { CommitWithFiles } from "../types/analysis";
import { buildWrappedStory } from "./scenes";
import { computePersonality } from "./personality";
import { computeStreaks } from "./streaks";

function commit(
  partial: Partial<CommitWithFiles> & {
    hash: string;
    subject: string;
    authorDate: string;
  }
): CommitWithFiles {
  return {
    shortHash: partial.hash.slice(0, 7),
    authorName: partial.authorName ?? "Ada",
    authorEmail: partial.authorEmail ?? "ada@example.com",
    committerName: partial.authorName ?? "Ada",
    committerEmail: partial.authorEmail ?? "ada@example.com",
    committerDate: partial.authorDate,
    body: "",
    parents: [],
    files: partial.files ?? [
      { path: "src/a.ts", status: "modified", additions: 10, deletions: 2 },
    ],
    additions: partial.additions ?? 10,
    deletions: partial.deletions ?? 2,
    ...partial,
  };
}

describe("computeStreaks", () => {
  it("finds consecutive active days and quiet gaps", () => {
    const streaks = computeStreaks([
      { date: "2024-01-01", commits: 1, additions: 1, deletions: 0, contributors: 1 },
      { date: "2024-01-02", commits: 2, additions: 1, deletions: 0, contributors: 1 },
      { date: "2024-01-03", commits: 1, additions: 1, deletions: 0, contributors: 1 },
      { date: "2024-01-20", commits: 1, additions: 1, deletions: 0, contributors: 1 },
    ]);
    expect(streaks.longestActiveDays).toBe(3);
    expect(streaks.longestActiveStart).toBe("2024-01-01");
    expect(streaks.longestActiveEnd).toBe("2024-01-03");
    expect(streaks.longestQuietDays).toBe(16);
  });

  it("handles empty activity", () => {
    const s = computeStreaks([]);
    expect(s.longestActiveDays).toBe(0);
  });
});

describe("buildWrappedStory", () => {
  it("builds a substantial adaptive story from the demo analysis", () => {
    const analysis = generateDemoAnalysis();
    const story = buildWrappedStory(analysis);
    expect(story.scenes.length).toBeGreaterThanOrEqual(12);
    expect(story.scenes[0]!.type).toBe("opening");
    expect(story.scenes[story.scenes.length - 1]!.type).toBe("closing");
    expect(story.personality.label.length).toBeGreaterThan(0);
    expect(story.shareCards.some((c) => c.kind === "recap")).toBe(true);
    expect(story.shareCards.some((c) => c.kind === "personality")).toBe(true);
    // no duplicate scene types in primary set (except we only emit once each)
    const types = story.scenes.map((s) => s.type);
    expect(new Set(types).size).toBe(types.length);
    // headline uses real commit count
    const headline = story.scenes.find((s) => s.type === "headline");
    expect(headline?.hero).toBe(analysis.overview.commitCount);
  });

  it("omits people/collaboration scenes for solo tiny repos", () => {
    const analysis = analyzeRepository({
      commits: [
        commit({
          hash: "1".repeat(40),
          subject: "init",
          authorDate: "2024-06-01T12:00:00.000Z",
          files: [
            { path: "README.md", status: "added", additions: 5, deletions: 0 },
          ],
          additions: 5,
          deletions: 0,
        }),
      ],
      tags: [],
      repository: { name: "tiny" },
    });
    const story = buildWrappedStory(analysis);
    expect(story.scenes.some((s) => s.type === "opening")).toBe(true);
    expect(story.scenes.some((s) => s.type === "closing")).toBe(true);
    expect(story.scenes.some((s) => s.type === "people")).toBe(false);
    expect(story.scenes.some((s) => s.type === "collaboration")).toBe(false);
    expect(story.scenes.some((s) => s.type === "releases")).toBe(false);
    expect(story.personality.id).toBe("first_light");
    // still coherent
    expect(story.scenes.length).toBeGreaterThanOrEqual(5);
    expect(story.scenes.length).toBeLessThan(14);
  });

  it("is deterministic for the same analysis input", () => {
    const analysis = generateDemoAnalysis();
    const a = buildWrappedStory(analysis);
    const b = buildWrappedStory(analysis);
    expect(a.scenes.map((s) => s.id)).toEqual(b.scenes.map((s) => s.id));
    expect(a.personality.label).toBe(b.personality.label);
  });
});

describe("computePersonality", () => {
  it("stable label for demo", () => {
    const analysis = generateDemoAnalysis();
    const streaks = computeStreaks(analysis.activity.byDay);
    const p1 = computePersonality(analysis, streaks);
    const p2 = computePersonality(analysis, streaks);
    expect(p1.id).toBe(p2.id);
    expect(p1.reasons.length).toBeGreaterThan(0);
  });
});
