import { describe, expect, it } from "vitest";
import { generateDemoAnalysis } from "../demo/generate";
import { analyzeRepository } from "../analysis/metrics";
import type { CommitWithFiles } from "../types/analysis";
import { buildWrappedStory } from "./scenes";
import { computePersonality } from "./personality";
import { pickRisingStar } from "./rising-star";
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
    // demo seeds a late-joining Barbara Liskov for rising-star
    const rising = story.scenes.find((s) => s.type === "rising_star");
    expect(rising?.title).toBe("Barbara Liskov");
    expect(story.shareCards.some((c) => c.kind === "rising_star")).toBe(true);
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

describe("pickRisingStar", () => {
  it("selects the dense late-joiner in demo history", () => {
    const analysis = generateDemoAnalysis();
    const star = pickRisingStar(analysis);
    expect(star).not.toBeNull();
    expect(star!.contributor.name).toBe("Barbara Liskov");
    expect(star!.lateness).toBeGreaterThanOrEqual(0.4);
    expect(star!.contributor.commits).toBeGreaterThanOrEqual(4);
  });

  it("is deterministic and skips early equal-weight casts", () => {
    const analysis = analyzeRepository({
      commits: [
        commit({
          hash: "a".repeat(40),
          subject: "init",
          authorDate: "2024-01-01T12:00:00.000Z",
          authorName: "Early",
          authorEmail: "early@ex.com",
        }),
        commit({
          hash: "b".repeat(40),
          subject: "work",
          authorDate: "2024-01-10T12:00:00.000Z",
          authorName: "Early",
          authorEmail: "early@ex.com",
        }),
        commit({
          hash: "c".repeat(40),
          subject: "more",
          authorDate: "2024-02-01T12:00:00.000Z",
          authorName: "Mid",
          authorEmail: "mid@ex.com",
        }),
        commit({
          hash: "d".repeat(40),
          subject: "later",
          authorDate: "2024-03-01T12:00:00.000Z",
          authorName: "Mid",
          authorEmail: "mid@ex.com",
        }),
        // 20 commits total needed — pad with Early
        ...Array.from({ length: 16 }, (_, i) =>
          commit({
            hash: i.toString(16).padStart(40, "e"),
            subject: `pad ${i}`,
            authorDate: `2024-01-${String(2 + (i % 20)).padStart(2, "0")}T12:00:00.000Z`,
            authorName: "Early",
            authorEmail: "early@ex.com",
          })
        ),
      ],
      tags: [],
      repository: { name: "even" },
    });
    // Mid joined early enough that lateness may fail; no dense late star
    expect(pickRisingStar(analysis)).toBeNull();
  });

  it("picks a true late dense contributor over early main cast", () => {
    const commits: CommitWithFiles[] = [];
    // Early workhorse
    for (let i = 0; i < 30; i++) {
      commits.push(
        commit({
          hash: `aa${i.toString(16).padStart(38, "0")}`,
          subject: `early ${i}`,
          authorDate: new Date(Date.UTC(2023, 0, 1 + i)).toISOString(),
          authorName: "Lead",
          authorEmail: "lead@ex.com",
        })
      );
    }
    // Peer present from the start
    for (let i = 0; i < 10; i++) {
      commits.push(
        commit({
          hash: `bb${i.toString(16).padStart(38, "0")}`,
          subject: `peer ${i}`,
          authorDate: new Date(Date.UTC(2023, 0, 5 + i * 3)).toISOString(),
          authorName: "Peer",
          authorEmail: "peer@ex.com",
        })
      );
    }
    // Late star: starts after 40% of ~year timeline, dense activity
    for (let i = 0; i < 12; i++) {
      commits.push(
        commit({
          hash: `cc${i.toString(16).padStart(38, "0")}`,
          subject: `rocket ${i}`,
          authorDate: new Date(Date.UTC(2023, 8, 1 + i)).toISOString(),
          authorName: "Rookie",
          authorEmail: "rookie@ex.com",
        })
      );
    }
    const analysis = analyzeRepository({
      commits,
      tags: [],
      repository: { name: "rocket" },
    });
    const star = pickRisingStar(analysis);
    expect(star?.contributor.name).toBe("Rookie");
    expect(star!.lateness).toBeGreaterThanOrEqual(0.4);
  });
});
