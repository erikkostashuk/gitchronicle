import type {
  AnalysisResult,
  CommitWithFiles,
  TagInfo,
} from "../types/analysis";
import { analyzeRepository } from "../analysis/metrics";

/**
 * Build a rich synthetic commit history for the bundled demo.
 * Deterministic — same output every run.
 */
export function generateDemoCommits(): {
  commits: CommitWithFiles[];
  tags: TagInfo[];
} {
  const authors = [
    { name: "Ada Lovelace", email: "ada@acme.dev" },
    { name: "Grace Hopper", email: "grace@acme.dev" },
    { name: "Alan Turing", email: "alan@acme.dev" },
    { name: "Katherine Johnson", email: "kj@acme.dev" },
    { name: "Linus Torvalds", email: "linus@acme.dev" },
    { name: "Margaret Hamilton", email: "margaret@acme.dev" },
    { name: "Ada Lovelace", email: "ada@users.noreply.github.com" }, // alias
  ];

  const subjects = [
    "feat: initial project scaffold",
    "feat: add CLI entrypoint",
    "docs: write README",
    "feat: implement config parser",
    "test: unit tests for config",
    "fix: handle empty config files",
    "refactor: extract logger module",
    "feat: add HTTP server",
    "feat: REST endpoints for projects",
    "chore: bump dependencies",
    "feat: add SQLite persistence",
    "fix: race condition in writer",
    "docs: API documentation",
    "feat: background job worker",
    "test: integration tests for jobs",
    "refactor: simplify job state machine",
    "feat: dashboard UI shell",
    "feat: activity charts",
    "fix: timezone handling in heatmap",
    "feat: contributor profiles",
    "build: docker multi-stage image",
    "ci: github actions workflow",
    "feat: release notes generator",
    "perf: cache analysis results",
    "feat: co-change graph",
    "fix: graph layout overflow",
    "refactor: migrate to TypeScript",
    "feat: time machine playback",
    "docs: architecture decision records",
    "feat: story presentation mode",
    "fix: memory leak in analyzer",
    "chore: cleanup deprecated APIs",
    "feat: language evolution view",
    "test: e2e smoke suite",
    "feat: hotspots ranking",
    "fix: ownership calculation edge case",
    "feat: bus factor indicators",
    "docs: security limitations",
    "feat: import public GitHub repos",
    "fix: validate clone URLs strictly",
    "refactor: split analysis pipeline",
    "feat: markdown report export",
    "chore: release preparation",
    "feat: dark theme polish",
    "fix: mobile layout regressions",
    "feat: command palette",
    "build: pnpm workspace scripts",
    "feat: development eras detection",
    "test: metric snapshot tests",
    "docs: contribution guide",
  ];

  const filePools = [
    ["src/index.ts", "src/cli.ts", "package.json", "README.md"],
    ["src/config.ts", "src/logger.ts", "tests/config.test.ts"],
    ["src/server.ts", "src/routes/projects.ts", "src/db.ts"],
    ["src/jobs/worker.ts", "src/jobs/queue.ts", "tests/jobs.test.ts"],
    ["web/App.tsx", "web/charts/Activity.tsx", "web/styles.css"],
    ["web/people/Profile.tsx", "web/graphs/CoChange.tsx"],
    ["src/analysis/metrics.ts", "src/analysis/eras.ts", "src/git/parse.ts"],
    ["Dockerfile", ".github/workflows/ci.yml", "docker-compose.yml"],
    ["docs/architecture.md", "docs/security.md", "CONTRIBUTING.md"],
    ["web/timemachine/Player.tsx", "web/story/Deck.tsx", "web/hotspots/Table.tsx"],
  ];

  const start = new Date("2021-03-15T10:00:00.000Z").getTime();
  const commits: CommitWithFiles[] = [];
  let dayOffset = 0;

  for (let i = 0; i < 180; i++) {
    // uneven activity: bursts and quiet periods
    if (i === 40) dayOffset += 21; // quiet
    if (i === 90) dayOffset += 3;
    if (i > 100 && i < 115) dayOffset += 0; // dense burst
    else dayOffset += 1 + (i % 5 === 0 ? 2 : 0);

    const author = authors[i % authors.length]!;
    const subject = subjects[i % subjects.length]!;
    const pool = filePools[i % filePools.length]!;
    const filesChanged = pool.map((path, fi) => {
      const additions = 5 + ((i * 7 + fi * 13) % 80);
      const deletions = (i + fi) % 3 === 0 ? (i * 3 + fi) % 40 : (i + fi) % 12;
      let status: "added" | "modified" | "deleted" | "renamed" = "modified";
      if (i < 5 && fi === 0) status = "added";
      if (i === 60 && fi === 0) {
        return {
          path: path.replace("src/", "packages/core/"),
          previousPath: path,
          status: "renamed" as const,
          additions,
          deletions,
        };
      }
      if (i === 120 && path.includes("deprecated")) status = "deleted";
      return { path, status, additions, deletions };
    });

    // occasional large migration commit
    if (i === 75) {
      filesChanged.push(
        ...Array.from({ length: 25 }, (_, k) => ({
          path: `src/legacy/module${k}.js`,
          status: "deleted" as const,
          additions: 0,
          deletions: 40 + k,
        })),
        ...Array.from({ length: 20 }, (_, k) => ({
          path: `src/core/module${k}.ts`,
          status: "added" as const,
          additions: 50 + k,
          deletions: 0,
        }))
      );
    }

    const ts = new Date(start + dayOffset * 86400000 + (i % 14) * 3600000);
    // vary hours for histogram
    ts.setUTCHours(8 + (i % 12), (i * 7) % 60, 0, 0);

    const hash = `demo${i.toString(16).padStart(36, "0")}`;
    const additions = filesChanged.reduce((s, f) => s + f.additions, 0);
    const deletions = filesChanged.reduce((s, f) => s + f.deletions, 0);

    commits.push({
      hash,
      shortHash: hash.slice(0, 7),
      authorName: author.name,
      authorEmail: author.email,
      authorDate: ts.toISOString(),
      committerName: author.name,
      committerEmail: author.email,
      committerDate: ts.toISOString(),
      subject,
      body: i % 10 === 0 ? "Detailed notes for this change." : "",
      parents: i === 0 ? [] : [commits[i - 1]!.hash],
      files: filesChanged,
      additions,
      deletions,
    });
  }

  const tagPoints = [
    { i: 20, name: "v0.1.0" },
    { i: 50, name: "v0.2.0" },
    { i: 80, name: "v1.0.0" },
    { i: 120, name: "v1.1.0" },
    { i: 160, name: "v2.0.0" },
  ];

  const tags: TagInfo[] = tagPoints.map((t) => ({
    name: t.name,
    hash: commits[t.i]!.hash,
    date: commits[t.i]!.authorDate,
    message: `Release ${t.name}`,
  }));

  return { commits, tags };
}

export function generateDemoAnalysis(): AnalysisResult {
  const { commits, tags } = generateDemoCommits();
  return analyzeRepository({
    commits,
    tags,
    repository: {
      name: "acme-toolkit",
      fullName: "acme/acme-toolkit",
      url: "https://github.com/acme/acme-toolkit",
      defaultBranch: "main",
      description: "Bundled demo repository for GitChronicle",
    },
    limits: {
      maxGraphNodes: 80,
      maxGraphEdges: 200,
      maxTimelineSamples: 120,
    },
  });
}
