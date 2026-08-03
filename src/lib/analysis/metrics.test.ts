import { describe, expect, it } from "vitest";
import { categorizeCommit, tallyCategories } from "./categories";
import { languageFromPath } from "./languages";
import {
  analyzeRepository,
  computeActivity,
  computeCoChange,
  computeFileStats,
  detectLargeCommits,
  sortCommitsChronological,
} from "./metrics";
import type { CommitWithFiles } from "../types/analysis";
import { generateDemoCommits, generateDemoAnalysis } from "../demo/generate";
import { generateReleaseNotes, generateRepositoryReport } from "../exports/markdown";
import { isValidGitHubUrl, validateGitHubUrl } from "../git/validate";

function commit(
  partial: Partial<CommitWithFiles> & { hash: string; subject: string; authorDate: string }
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

describe("categorizeCommit", () => {
  it("uses conventional commits", () => {
    expect(categorizeCommit("feat: add login")).toBe("feature");
    expect(categorizeCommit("fix(api): null check")).toBe("fix");
    expect(categorizeCommit("docs: update readme")).toBe("docs");
    expect(categorizeCommit("refactor: clean up")).toBe("refactor");
    expect(categorizeCommit("test: cover parser")).toBe("test");
    expect(categorizeCommit("build: docker image")).toBe("build");
  });

  it("falls back to keywords", () => {
    expect(categorizeCommit("Fixed the crash on startup")).toBe("fix");
    expect(categorizeCommit("Implement user settings page")).toBe("feature");
  });
});

describe("tallyCategories", () => {
  it("counts categories", () => {
    const t = tallyCategories([
      { subject: "feat: a" },
      { subject: "feat: b" },
      { subject: "fix: c" },
    ]);
    expect(t.find((x) => x.category === "feature")?.count).toBe(2);
    expect(t.find((x) => x.category === "fix")?.count).toBe(1);
  });
});

describe("languageFromPath", () => {
  it("maps extensions", () => {
    expect(languageFromPath("src/app.tsx")).toBe("TypeScript");
    expect(languageFromPath("main.py")).toBe("Python");
    expect(languageFromPath("Dockerfile")).toBe("Docker");
  });
});

describe("computeActivity", () => {
  it("aggregates by day", () => {
    const commits = [
      commit({
        hash: "1".repeat(40),
        subject: "a",
        authorDate: "2022-01-01T10:00:00.000Z",
      }),
      commit({
        hash: "2".repeat(40),
        subject: "b",
        authorDate: "2022-01-01T15:00:00.000Z",
        authorEmail: "other@example.com",
        authorName: "Other",
      }),
      commit({
        hash: "3".repeat(40),
        subject: "c",
        authorDate: "2022-01-02T10:00:00.000Z",
      }),
    ];
    const activity = computeActivity(commits);
    expect(activity.byDay).toHaveLength(2);
    expect(activity.byDay[0]!.commits).toBe(2);
    expect(activity.byDay[0]!.contributors).toBe(2);
    expect(activity.hourHistogram[10]).toBe(2);
  });
});

describe("computeFileStats", () => {
  it("tracks churn and ownership", () => {
    const commits = [
      commit({
        hash: "1".repeat(40),
        subject: "a",
        authorDate: "2022-01-01T00:00:00.000Z",
        files: [
          { path: "src/hot.ts", status: "added", additions: 100, deletions: 0 },
        ],
        additions: 100,
        deletions: 0,
      }),
      commit({
        hash: "2".repeat(40),
        subject: "b",
        authorDate: "2022-01-02T00:00:00.000Z",
        files: [
          {
            path: "src/hot.ts",
            status: "modified",
            additions: 50,
            deletions: 20,
          },
        ],
        additions: 50,
        deletions: 20,
      }),
    ];
    const files = computeFileStats(commits);
    const hot = files.find((f) => f.path === "src/hot.ts");
    expect(hot).toBeTruthy();
    expect(hot!.commits).toBe(2);
    expect(hot!.churn).toBe(170);
    expect(hot!.ownership[0]!.share).toBe(1);
  });
});

describe("computeCoChange", () => {
  it("links files changed together", () => {
    const commits = Array.from({ length: 5 }, (_, i) =>
      commit({
        hash: String(i).repeat(40),
        subject: `c${i}`,
        authorDate: `2022-01-0${i + 1}T00:00:00.000Z`,
        files: [
          { path: "a.ts", status: "modified", additions: 1, deletions: 0 },
          { path: "b.ts", status: "modified", additions: 1, deletions: 0 },
        ],
      })
    );
    const graph = computeCoChange(commits, 80, 200);
    expect(graph.nodes).toContain("a.ts");
    expect(graph.edges.some((e) => e.weight >= 2)).toBe(true);
  });
});

describe("detectLargeCommits", () => {
  it("flags high file-count commits", () => {
    const files = Array.from({ length: 30 }, (_, i) => ({
      path: `f${i}.ts`,
      status: "added" as const,
      additions: 10,
      deletions: 0,
    }));
    const commits = [
      commit({
        hash: "9".repeat(40),
        subject: "migrate everything",
        authorDate: "2022-06-01T00:00:00.000Z",
        files,
        additions: 300,
        deletions: 0,
      }),
    ];
    const large = detectLargeCommits(commits);
    expect(large).toHaveLength(1);
    expect(large[0]!.filesChanged).toBe(30);
  });
});

describe("analyzeRepository + demo", () => {
  it("produces a full analysis from demo commits", () => {
    const { commits, tags } = generateDemoCommits();
    expect(commits.length).toBeGreaterThan(50);
    const result = analyzeRepository({
      commits,
      tags,
      repository: { name: "acme-toolkit" },
    });
    expect(result.overview.commitCount).toBe(commits.length);
    expect(result.contributors.length).toBeGreaterThan(1);
    expect(result.files.length).toBeGreaterThan(1);
    expect(result.activity.byDay.length).toBeGreaterThan(0);
    expect(result.timeline.length).toBeGreaterThan(0);
    expect(result.story.length).toBeGreaterThan(0);
    expect(result.hotspots.length).toBeGreaterThan(0);
    expect(result.eras.length).toBeGreaterThan(0);
    expect(result.releases.length).toBe(tags.length);
    // Ada alias merge by different emails stays separate if emails differ —
    // but we should still have multiple contributors
    expect(result.overview.narrative).toContain("acme-toolkit");
  });

  it("generateDemoAnalysis is deterministic enough for UI", () => {
    const a = generateDemoAnalysis();
    const b = generateDemoAnalysis();
    expect(a.overview.commitCount).toBe(b.overview.commitCount);
    expect(a.contributors.length).toBe(b.contributors.length);
  });

  it("pluralizes narrative for single-commit repositories", () => {
    const result = analyzeRepository({
      commits: [
        commit({
          hash: "a".repeat(40),
          subject: "initial",
          authorDate: "2024-01-01T12:00:00.000Z",
          authorName: "Solo",
          authorEmail: "solo@example.com",
          files: [
            { path: "README.md", status: "added", additions: 5, deletions: 0 },
          ],
          additions: 5,
          deletions: 0,
        }),
      ],
      tags: [],
      repository: { name: "tiny-repo" },
    });
    expect(result.overview.commitCount).toBe(1);
    expect(result.overview.contributorCount).toBe(1);
    expect(result.overview.narrative).toMatch(/1 commit from 1 contributor/);
    expect(result.overview.narrative).not.toMatch(/1 commits/);
    expect(result.overview.narrative).not.toMatch(/1 contributors/);
  });

  it("deduplicates timeline tree dir/file labels", () => {
    const result = analyzeRepository({
      commits: [
        commit({
          hash: "b".repeat(40),
          subject: "scaffold",
          authorDate: "2024-02-01T12:00:00.000Z",
          files: [
            { path: "README.md", status: "added", additions: 3, deletions: 0 },
            { path: "src/index.ts", status: "added", additions: 10, deletions: 0 },
          ],
          additions: 13,
          deletions: 0,
        }),
      ],
      tags: [],
      repository: { name: "tree-repo" },
    });
    const sample = result.timeline[result.timeline.length - 1]!;
    const paths = sample.tree.map((t) => t.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(sample.tree.filter((t) => t.path === "README.md").length).toBe(1);
    expect(sample.tree.some((t) => t.path === "src" && t.kind === "dir")).toBe(
      true
    );
  });
});

describe("markdown exports", () => {
  it("builds non-empty report and release notes", () => {
    const result = generateDemoAnalysis();
    const report = generateRepositoryReport(result);
    expect(report).toContain("# ");
    expect(report).toContain("## Overview");
    expect(report.length).toBeGreaterThan(200);
    const notes = generateReleaseNotes(result.releases[0]!, result.repository.name);
    expect(notes).toContain(result.releases[0]!.tag);
    expect(notes).toContain("## Summary");
  });
});

describe("large-repo performance helpers", () => {
  it("sortCommitsChronological is stable by date then hash", () => {
    const commits = [
      commit({
        hash: "b".repeat(40),
        subject: "second",
        authorDate: "2024-02-01T00:00:00.000Z",
      }),
      commit({
        hash: "a".repeat(40),
        subject: "first",
        authorDate: "2024-01-01T00:00:00.000Z",
      }),
    ];
    const ordered = sortCommitsChronological(commits);
    expect(ordered[0]!.subject).toBe("first");
    expect(ordered[1]!.subject).toBe("second");
  });

  it("computeCoChange respects pair key and files-per-commit caps", () => {
    // Wide commits: many files co-changed every time
    const files = Array.from({ length: 40 }, (_, i) => ({
      path: `src/mod${i}.ts`,
      status: "modified" as const,
      additions: 1,
      deletions: 0,
    }));
    const commits = Array.from({ length: 50 }, (_, i) =>
      commit({
        hash: i.toString(16).padStart(40, "c"),
        subject: `batch ${i}`,
        authorDate: `2024-01-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
        files,
        additions: 40,
        deletions: 0,
      })
    );
    const graph = computeCoChange(commits, 80, 200, {
      maxPairKeys: 100,
      maxFilesPerCommit: 10,
    });
    // Pair map capped during scan; final edges still ≤ maxEdges
    expect(graph.edges.length).toBeLessThanOrEqual(200);
    expect(graph.nodes.length).toBeLessThanOrEqual(80);
  });

  it("analyzeRepository finishes a wide synthetic history quickly", () => {
    const files = Array.from({ length: 15 }, (_, i) => ({
      path: `pkg/f${i}.ts`,
      status: "modified" as const,
      additions: 3,
      deletions: 1,
    }));
    const commits = Array.from({ length: 800 }, (_, i) =>
      commit({
        hash: i.toString(16).padStart(40, "d"),
        subject: i % 5 === 0 ? `feat: item ${i}` : `fix: item ${i}`,
        authorDate: new Date(Date.UTC(2020, 0, 1 + (i % 1000), i % 24)).toISOString(),
        authorName: i % 2 === 0 ? "Ada" : "Grace",
        authorEmail: i % 2 === 0 ? "ada@ex.com" : "grace@ex.com",
        files,
        additions: 45,
        deletions: 15,
      })
    );
    const t0 = performance.now();
    const result = analyzeRepository({
      commits,
      tags: [],
      repository: { name: "wide" },
      limits: {
        maxGraphNodes: 40,
        maxGraphEdges: 80,
        maxCochangePairs: 5_000,
        maxCochangeFilesPerCommit: 12,
      },
    });
    const ms = performance.now() - t0;
    expect(result.overview.commitCount).toBe(800);
    expect(result.coChange.edges.length).toBeLessThanOrEqual(80);
    // Generous CI bound — guards against accidental O(n²) regressions
    expect(ms).toBeLessThan(8_000);
  });
});

describe("GitHub URL validation", () => {
  it("accepts valid HTTPS GitHub URLs", () => {
    expect(isValidGitHubUrl("https://github.com/vercel/next.js")).toBe(true);
    const v = validateGitHubUrl("https://github.com/vercel/next.js.git");
    expect(v.owner).toBe("vercel");
    expect(v.repo).toBe("next.js");
    expect(v.cloneUrl).toBe("https://github.com/vercel/next.js.git");
  });

  it("rejects non-GitHub and non-HTTPS", () => {
    expect(isValidGitHubUrl("http://github.com/a/b")).toBe(false);
    expect(isValidGitHubUrl("https://gitlab.com/a/b")).toBe(false);
    expect(isValidGitHubUrl("https://github.com/onlyowner")).toBe(false);
    expect(isValidGitHubUrl("github.com/a/b")).toBe(false);
  });
});
