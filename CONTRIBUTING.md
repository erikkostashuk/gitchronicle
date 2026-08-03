# Contributing to GitChronicle

Thanks for helping improve GitChronicle. This guide covers setup, how the
project is laid out, how data flows through it, and step-by-step recipes for the
changes people most often want to make.

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Development setup

**Requirements:** Node.js 22+, pnpm 10+, and `git` on `PATH`.

```bash
git clone https://github.com/erikkostashuk/gitchronicle.git
cd gitchronicle
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The bundled demo project
(Acme Toolkit) is generated deterministically in code
(`src/lib/demo/generate.ts`) — no network, no fixtures to download — so you can
work entirely offline.

**Working against a real repository:**

```bash
pnpm analyze -- /absolute/path/to/some/repo
```

It prints the URL to open. Analysing this repository itself is a good smoke test.

**Resetting state.** Delete `data/gitchronicle.db*` and re-run `pnpm db:migrate
&& pnpm seed`. `data/repos/` holds clones and is safe to delete at any time.

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/lib/git` | Process execution (`exec.ts`), cloning, URL validation, log parsing |
| `src/lib/analysis` | Pure metric calculation — no I/O, no React |
| `src/lib/wrapped` | Turns an analysis into the Wrapped story (scenes, personality, streaks) |
| `src/lib/db` | SQLite schema and client, including the migration SQL |
| `src/lib/jobs` | Background job worker, retry, stale-job and orphan recovery |
| `src/lib/security` | Rate limiting and analysis admission control |
| `src/lib/exports` | Markdown report generation |
| `src/components/wrapped` | Player, scene layouts, palettes, share cards |
| `src/components/dashboard` | Dashboard sections |
| `src/components/charts` | Recharts wrappers and chart theming |
| `src/app` | App Router pages and API route handlers |
| `src/app/globals.css` | Design tokens, typography primitives, motion system |
| `scripts` | CLI entrypoints (migrate, seed, analyze, worker, cleanup, screenshots, icons) |
| `e2e` | Playwright tests |
| `src/lib/demo` | Deterministic generator for the bundled demo project |
| `data/` | Runtime only — SQLite database, clones, generated demo JSON. Not tracked |

## How data flows

### Ingesting a repository

```
POST /api/projects
  ├─ validateGitHubUrl()          src/lib/git/validate.ts
  ├─ rate limit + capacity check  src/lib/security/*
  ├─ INSERT project + job (SQLite)
  └─ processJobById()             src/lib/jobs/worker.ts   ← runs in-process
       ├─ cloneGitHubRepo()       src/lib/git/clone.ts     → data/tmp → data/repos
       ├─ collectCommits()        src/lib/analysis/run.ts  → git log via gitExec
       ├─ analyzeRepository()     src/lib/analysis/metrics.ts  (pure)
       ├─ INSERT analysis (result_json + summary_json)
       └─ cleanup clone unless KEEP_CLONES=true
```

The browser polls `GET /api/jobs/[id]` for progress.

### Rendering

```
/repo/[slug]/wrapped  (Server Component)
  ├─ read analysis JSON from SQLite
  ├─ buildWrappedStory()   src/lib/wrapped/index.ts   (pure)
  └─ <WrappedPlayer story> src/components/wrapped/wrapped-player.tsx
        └─ <SceneStage>    picks a layout from STAGES by scene.type
```

**The rule that keeps this fast and safe: the UI never runs `git`.** Pages read
only persisted analysis. Everything expensive happens once, in a job.

**The other rule: analysis is pure.** `src/lib/analysis` and `src/lib/wrapped`
take data in and return data out — no file system, no database, no React. That
is why they are cheap to unit test, and why tests are expected for changes there.

## Recipes

### Add a metric

1. Add the shape to `src/lib/types/analysis.ts` so it is part of `AnalysisResult`.
2. Write a **pure** calculator in `src/lib/analysis/metrics.ts` that takes
   commits/files and returns your new shape. No I/O.
3. Call it from `analyzeRepository()` and include it in the returned object.
4. Add tests in `src/lib/analysis/metrics.test.ts` — cover the empty repository,
   the single-commit repository, and one realistic case.
5. Bound anything that can grow with repository size. If your metric is
   `O(files²)` or `O(commits²)`, add a cap and read it from `src/lib/env.ts`
   rather than hard-coding it.
6. Surface it in a dashboard section or a Wrapped scene.

Existing analyses are **not** recomputed automatically — re-run `pnpm analyze`
or re-import to see your metric on a project that was analysed before your change.

### Add a Wrapped scene

1. Add the scene name to `WrappedSceneType` in `src/lib/wrapped/types.ts`.
2. In `src/lib/wrapped/scenes.ts`, build the scene from the analysis and push it
   into the story. **Emit nothing when the data doesn't support it** — a solo
   repository should not get a collaboration scene. This is what makes the story
   adaptive rather than a fixed slideshow.
3. Add a layout component in `src/components/wrapped/scene-stage.tsx` and
   register it in the `STAGES` map keyed by your scene type. Reuse an existing
   stage if the composition genuinely matches; otherwise write a new one — each
   beat is meant to look different.
4. Pick a palette from `WrappedPalette` (`src/components/wrapped/scene-theme.ts`)
   and check it in both light and dark.
5. Handle `reduceMotion`: keep the final visual state, drop the movement.
6. Add a case to `src/lib/wrapped/wrapped.test.ts` proving the scene appears when
   the data supports it and is absent when it doesn't.

Scenes are pure data (`src/lib/wrapped` has no React), which is what lets the
tests assert story structure without rendering anything.

### Add a database migration

There are no versioned migration files. `MIGRATION_SQL` in
`src/lib/db/client.ts` is a single idempotent script — `CREATE TABLE IF NOT
EXISTS`, `CREATE INDEX IF NOT EXISTS` — replayed on every start.

1. Append your statement to `MIGRATION_SQL`. It **must** be idempotent and safe
   to run against an existing populated database.
2. Adding a column to an existing table means `ALTER TABLE … ADD COLUMN`, which
   SQLite does not gate with `IF NOT EXISTS`. Guard it, or give it a default and
   tolerate the duplicate-column error — do not rewrite a table that may hold
   real analyses.
3. Mirror the change in the Drizzle schema (`src/lib/db/schema.ts`) so types stay
   correct.
4. Verify against a database that predates the change:

```bash
pnpm db:migrate && pnpm db:migrate   # must succeed twice
```

Never edit or reorder existing statements — deployed instances have already run
them.

### Add a test

Unit tests are Vitest, colocated as `src/**/*.test.ts`, and run in a Node
environment (there is no DOM setup — add `jsdom` and set `environment: "jsdom"`
in `vitest.config.mts` if you need one).

```bash
pnpm test          # once
pnpm test:watch    # while developing
```

End-to-end tests are Playwright in `e2e/`:

```bash
pnpm exec playwright install chromium webkit   # first time only
pnpm test:e2e
```

Both engines are needed: the `chromium` project runs Desktop Chrome and the
`mobile` project runs the iPhone 13 descriptor, which is webkit.

The Playwright config builds and starts a **production** server
(`pnpm seed && pnpm build && pnpm start`) rather than using dev, because dev-mode
HMR websocket failures can leave Client Components as inert SSR HTML and produce
confusing failures. Expect the first run to take a few minutes.

### Add a visualization

1. Chart components live in `src/components/charts`. Use Recharts, and take
   colours from `src/components/charts/theme.ts` — do not hard-code hex values.
2. Graph views use `@xyflow/react` and must respect `MAX_GRAPH_NODES` /
   `MAX_GRAPH_EDGES`; an unbounded graph will hang the browser on a large
   repository.
3. Verify contrast in **both** light and dark themes.
4. Provide loading, empty, and error states. A repository with one commit must
   not render a broken chart.
5. `src/lib/theme/design-system.test.ts` enforces contrast, hue separation and
   reduced-motion coverage — run `pnpm test` after touching tokens or palettes.

## Before opening a pull request

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Optional but appreciated: `pnpm test:e2e`.

CI runs all of the above plus a Docker image build with a `/api/health` smoke
test. It must be green before review.

## Guidelines

- Prefer small, focused pull requests.
- Keep the analysis engine independent of the UI — `src/lib/analysis` and
  `src/lib/wrapped` must not import React.
- **Never shell-interpolate untrusted input.** All `git` calls go through
  `gitExec()` with an argument array. See [SECURITY.md](./SECURITY.md).
- Bound anything that scales with repository size, and make the bound an env var.
- Keep user-facing errors free of server paths and dependency internals.
- Cover parsing and metric changes with Vitest.
- Everything must stay deterministic and offline — no third-party services or
  network calls at analysis time.

### Marketing screenshots

With a production server on port 3000 (`pnpm seed && pnpm build && PORT=3000 pnpm start`):

```bash
pnpm screenshots
```

Writes light-theme captures to `docs/screenshots/`. Only ever capture the demo
project or public repositories — never a private repository or anything showing
real credentials.

## Commit style

- Use clear, descriptive commit messages: what changed, and why.
- Keep unrelated changes in separate commits.
- Attribute commits with your own Git author identity.

## Security

Do not open public issues for vulnerabilities. Follow [SECURITY.md](./SECURITY.md).
