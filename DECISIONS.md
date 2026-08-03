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
- The synthetic “Acme Toolkit” history is **generated deterministically in code** (`src/lib/demo/generate.ts`) — fixed dates, no randomness — so the demo needs no network and no committed fixture.
- `pnpm seed` runs the generator, inserts the project into SQLite, and dumps the analysis to `data/demo/acme-toolkit.json` for inspection. That JSON is a build artifact, not an input: nothing reads it, and `data/` is untracked.
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

## No auth / no paid services
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
- Personality and scene eligibility are pure deterministic functions. Rules live in `src/lib/wrapped/personality.ts`.
- Share cards use browser canvas PNG export (no extra deps); closing scene hosts downloads.
- Demo and import completion routes land on `/repo/<slug>/wrapped` first; analytics remain one click away.

## Dashboard chart colors
- Six hue-separated series tokens, each held to ≥2.4:1 against paper. `--chart-4` is a deepened amber (`#c97a06`) because bright amber only clears 1.9:1 and disappears on thin marks.
- `--chart-1` is coral, matching `--primary`; the rest diverge in hue (not lightness) so adjacent series stay distinguishable in both themes.
- Recharts chrome is centralized in `src/components/charts/theme.ts` so tooltips always set `color: var(--popover-foreground)` (Recharts defaults ignore theme otherwise).
- `src/lib/theme/design-system.test.ts` asserts these contrast and hue-separation rules, so a regression fails the test run rather than shipping.

## Marketing screenshots
- Capture script: `scripts/capture-screenshots.ts` (`pnpm screenshots`) against production `next start` on `:3000`.
- Forces light theme via `localStorage gitchronicle-theme` + `colorScheme: "light"`.
- Wrapped titles paint solid ink rather than `background-clip: text`, so they stay visible under CSS transforms and in PNG captures.
- Capture Wrapped frames on a fresh page: a prior `fullPage: true` capture leaves Chromium's compositor mid-resize and offsets screenshots of fixed-position overlays — the DOM is correct, the PNG is not.
- Only ever capture the demo project or a public repository; a local-path project leaks the developer's filesystem path into the README.

## Large-repo analysis cost
- Live `git log` uses subject-only pretty format (no `%b`) — commit messages drive categories; PR bodies dominate log size.
- Git stdout is collected as Buffer chunks then concatenated once.
- Metrics sort commits chronologically once per analysis.
- Co-change pairwise map is hard-capped (`MAX_COCHANGE_PAIRS`, default 40k); only the first `MAX_COCHANGE_FILES_PER_COMMIT` (24) files per commit participate in pairs. Final graph still respects node/edge caps.

## Project identity & recent list
- Display lists collapse accidental duplicates via pure `projectIdentityKey` (demo slug, GitHub `fullName`, normalized `localPath`, else name).
- Winner prefers `ready` over `failed`/in-progress, then newest `updatedAt`.
- Local CLI analyze reuses the row matching `localPath` so repeated `pnpm analyze -- /path` does not create `slug-1`, `slug-2`, …

## Stale job recovery
- Running jobs refresh `updatedAt` on every progress tick. Silence longer than **20 minutes** (`STALE_JOB_TTL_MS`) ⇒ treat as dead worker.
- `recoverStaleJobs()` flips job + project to `failed` with a message that points users at **Retry analysis**.
- Invoked from the worker idle loop, job claim paths, job status polling, and retry enqueue so the UI unsticks even without a separate sweeper process.

## Orphan project status
- Projects can remain `pending`/`cloning`/`analyzing` after a job already completed/failed (process crash mid-status update).
- `planOrphanProjectRepair` + `recoverOrphanProjects` reconcile: completed+analysis → `ready`; failed job → `failed`; missing job → `failed`; active job → leave alone.
- Runs after stale-job recovery inside `recoverStaleJobs()`, and whenever the recent-repo list is built.

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

## Visual identity — “Warm Press”
- **Product chrome defaults to light** (`next-themes` `defaultTheme="light"`, `enableSystem={false}`, storage key `gitchronicle-theme`). Users can still toggle dark.
- Surfaces are warm off-white paper (`--paper #fbf7f1`) with near-black ink (`--ink #16130f`, ≈17:1). The accent set is coral, cobalt, teal, amber, plum and lime, used for large colour fields rather than tinting the whole UI.
- An earlier iteration used Spotify's brand greens (`#1db954` / `#1ed760`) as the product identity. **They were removed deliberately** — the product should not read as someone else's brand — and `design-system.test.ts` fails if either value reappears in the stylesheet.
- **Wrapped is light-first too**, punctuated by a few deliberately dark beats (`midnight`, `slate` palettes) so the dark scenes land as emphasis rather than as the default.
- Scene dwell is **4.3s** (`SCENE_MS` in `wrapped-player.tsx`); autoplay stops on the closing scene and switches itself off under `prefers-reduced-motion`. Scene copy is deterministic and playful; metrics stay analysis-backed.

## Repository personality (deterministic, first match wins)
Rules live in `src/lib/wrapped/personality.ts`. No external call — the same repository always yields the same personality.

1. **The Phoenix** — a quiet stretch of ≥30 days, then activity resumes
2. **The Night Owl** — peak commit hour between 22:00 and 05:00 UTC
3. **The Weekend Builder** — ≥35% of commits on weekends
4. **The Relentless Refactorer** — ≥25% of commits categorised as refactors
5. **The Feature Factory** — ≥40% categorised as features
6. **The Steady Ship** — commit density ≥0.55 and age ≥60 days
7. **The Carefully Curated Monolith** — ≥80 files, ≤3 contributors
8. **The Fast-Moving Experiment** — age ≤45 days with ≥40 commits
9. **First Light** — ≤3 commits
10. Default — **The Steady Ship**

## Scene selection
- `buildWrappedStory` emits only scenes the data can fill, so a solo repository skips people/collaboration/releases and a two-commit repository still gets opening → recap → closing without empty visuals.
- `trimScenesToBudget` then holds the story to **16** scenes (`TARGET_MAX_SCENES`): narrative order is preserved, the spine (opening, headline, personality, recap, closing) is pinned, and the remainder fills by priority.
- `SceneStage` routes each scene *type* to its own layout — there is no shared template with swapped numbers.

