# GitChronicle Architectural Decisions

## Stack
- **Next.js App Router** for UI + API route handlers; Server Components for reads.
- **SQLite + Drizzle ORM** for zero-ops local persistence (no external DB).
- **better-sqlite3** for synchronous, simple job worker access.
- **pnpm** as package manager.
- **Zod** for env and input validation.
- **Recharts** for charts; **@xyflow/react** for co-change and collaboration graphs.
- **Vitest** + **Playwright** for unit and e2e tests.

## Analysis pipeline
1. Git process execution (`spawn` with argument arrays only — never shell interpolation).
2. Parse structured Git output into domain types.
3. Pure deterministic metric calculators (no I/O).
4. Serialize full analysis result as JSON into SQLite + optional denormalized summary columns.
5. UI reads only persisted analysis; never runs Git during page render.

## Jobs
- Simple durable job table (`pending` → `running` → `completed` | `failed`).
- Separate `pnpm worker` process polls and processes one job at a time (suitable for single self-hosted instance).
- Dev mode can also process jobs inline via API for convenience when worker is not running.
- Progress stored as integer 0–100 + stage message; clients poll `/api/jobs/[id]`.

## Demo data
- Precomputed analysis JSON for a synthetic “Acme Toolkit” repository lives under `data/demo/`.
- `pnpm seed` inserts the demo project into SQLite so the UI works offline with no Git clone.
- Demo is the primary zero-setup path.

## Ingestion safeguards
- Remote clones: HTTPS GitHub only (`github.com` host, validated with Zod).
- Clones confined to `DATA_DIR/repos/<project-id>/`.
- Timeouts on clone and analysis; max commits, max files, max graph edges configurable.
- Partial clones deleted on failure via cleanup helpers.

## Graph limits
- Co-change and collaboration graphs capped at analysis time (default top 80 nodes / 200 edges).
- Further client-side filtering available in the UI.

## Time Machine
- Uses sampled snapshots (not full tree at every commit) for large repos.
- Sample points chosen from commit density + release tags for narrative fidelity.

## No AI / no auth / no paid services
- Deterministic keyword + conventional-commit categorization only.
- Single-user self-host model; no multi-tenant auth.

## Tradeoffs
- Rename detection relies on `git log --follow` / rename detection flags where practical; not perfect for all cases.
- Ownership is approximate (lines/commits by path), not blame-accurate.
- Bus-factor is a simple ownership-concentration heuristic.
- Remote GitHub clone may be blocked in sandboxed CI; demo + local analyze are the reliable paths.

## Deployment packaging
- Prefer `pnpm start` (`next start`) over Next `output: "standalone"`. Docker already copies `node_modules` + `.next` and native `better-sqlite3` is simpler without the standalone file-trace subset. Standalone was removed after Next 16 warned that `next start` does not work with that mode.

## Wrapped product pivot
- Primary UX is **GitChronicle Wrapped**: pure `buildWrappedStory(AnalysisResult)` → full-screen `WrappedPlayer`. Analysis engine and dashboard are preserved.
- Personality and scene eligibility are pure deterministic functions (no AI). Rules live in `src/lib/wrapped/personality.ts`.
- Share cards use browser canvas PNG export (no extra deps); closing scene hosts downloads.
- Demo and import completion routes land on `/repo/<slug>/wrapped` first; analytics remain one click away.

## Dashboard chart colors
- Brand green remains `--primary` / `--chart-1` for single-series emphasis (activity area).
- Multi-series lines use diverging tokens: `--chart-2` is blue `#509bf5` (not a second green) so Files vs Commits read on light cards.
- Recharts chrome is centralized in `src/components/charts/theme.ts` so tooltips always set `color: var(--popover-foreground)` (Recharts defaults ignore theme otherwise).

## Marketing screenshots
- Capture script: `scripts/capture-screenshots.ts` (`pnpm screenshots`) against production `next start` on `:3000`.
- Forces light theme via `localStorage gitchronicle-theme` + `colorScheme: "light"`.
- Wrapped titles use solid white + green glow (not `background-clip: text`) so they stay visible under CSS transforms and in PNG captures.

## Analysis retry
- `POST /api/repos/[slug]/retry` enqueues a new job; never reuses a failed row as running without a clean pending insert.
- Decision tree is pure (`planRetryJob`): failed GitHub → `clone_and_analyze`; ready GitHub with `localPath` → `reanalyze`; local → `analyze_local`; demo → 400 (seed offline JSON).
- Concurrent pending/running jobs for the same project return **409**.
- UI: JobStatusPanel offers **Retry analysis** when failed and the source can re-run; inline `processJobById` keeps single-instance dev usable without a separate worker.

## Rising star selection
- Pure function `pickRisingStar(AnalysisResult)` — no per-commit author histogram required.
- Late = firstCommit at or after **40%** of the repo timeline; min 4 commits / 2 active days; overall ≥3 people and ≥20 commits.
- Score blends lateness, tenure density, velocity, and commit share; small score floor rejects cameo blips.
- Top committer is excluded only when they are an **early** founder (so main-character and rising-star frames stay distinct). A late #1 can still be the rising star.
- Demo history injects **Barbara Liskov** after ~65% of synthetic commits so the scene is visible offline.

## Visual identity (Spotify-adjacent)
- **Product chrome defaults to light** (`next-themes` `defaultTheme="light"`, `enableSystem={false}`, storage key `gitchronicle-theme`). Users can still toggle dark.
- Brand primary is Spotify-family green (`#1DB954` light / `#1ED760` dark), not teal/indigo. Surfaces are near-white (`#f6f6f6`) with near-black text (`#121212`).
- UI chrome uses pill shapes (buttons, nav active states, inputs, tabs, badges) for a familiar music-app feel without copying Spotify UI pixel-for-pixel.
- **Wrapped player stays full-bleed dark cinematic** regardless of shell theme — the story is a “film,” not a dashboard. Share-card canvas uses the same green/black language.
- Scene dwell ~2.8s for film pacing; autoplay stops on closing. Scene copy is deterministic and playful; metrics remain analysis-backed.

