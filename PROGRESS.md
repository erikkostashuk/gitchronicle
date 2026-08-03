# GitChronicle Progress

## Product: GitChronicle Wrapped

**Tagline:** Your repository had a year. Let’s replay it.

Primary experience is a cinematic, adaptive multi-scene Wrapped story from real Git analysis. Analytics dashboard is the deep dive after the story.

## Foundation (MVP — complete)
- [x] Next.js App Router + TypeScript strict + Tailwind + SQLite/Drizzle
- [x] Git parse → pure metrics → persisted JSON
- [x] Demo seed, local CLI analyze, GitHub HTTPS import
- [x] Dashboard sections + Markdown export + Docker + tests spine

## Wrapped Phase A — Pure storytelling engine
- [x] Typed Wrapped scene model (`src/lib/wrapped/types.ts`)
- [x] Deterministic streaks (`streaks.ts`)
- [x] Deterministic repository personality (`personality.ts` + documented rules)
- [x] Adaptive scene selection (`scenes.ts` / `buildWrappedStory`)
- [x] Unit tests (6 wrapped + existing parse/metrics)

## Wrapped Phase B — Cinematic player
- [x] Full-screen Wrapped player (progress, keyboard, swipe, reduced-motion)
- [x] ~15–25 adaptive scenes with strong typography (demo: 21)
- [x] Demo entry → `/repo/acme-toolkit/wrapped`
- [x] Local analyze prints `/repo/<slug>/wrapped`

## Wrapped Phase C — Share & polish
- [x] Downloadable PNG share cards (1200×630 + 1080×1080)
- [x] Closing CTAs → analytics / report / another repo
- [x] Landing rebranded for Wrapped
- [x] e2e for Wrapped nav + exports + retry API (**16/16**, hard keyboard + closing + PNG)
- [x] FINAL_AUDIT.md
- [x] lint / typecheck / test / build green

## Skeptic repairs
- [x] Closing scene scrollable (overflow-y-auto on scene body)
- [x] Wrapped outside dashboard layout (route group `(app)`)
- [x] e2e production server for reliable client hydration
- [x] PNG export evidence (export-cards.log / test-results/exports)

## Visual identity — Spotify-adjacent light default (2026-08-03)
- [x] Light product chrome default (`defaultTheme="light"`, `enableSystem={false}`)
- [x] CSS tokens: near-white surfaces + Spotify green `#1DB954` / `#1ED760` (not teal)
- [x] Pill buttons, solid green active nav, rounded inputs/tabs/badges
- [x] Landing hero: bold type + green accent (no teal/indigo gradients)
- [x] Scene copy: punchier deterministic jokes; density caps for single-screen film
- [x] Player: ~2.8s film autoplay, full-viewport frame, bounce/float motion, reduced-motion safe
- [x] Share card PNG palette aligned to green/black brand
- [x] Token/chrome unit tests (`src/lib/theme/spotify-light.test.ts`) — 39 unit tests total

## Rising star (2026-08-03)
- [x] Pure `pickRisingStar` (`src/lib/wrapped/rising-star.ts`) — lateness ≥ 40% of timeline, density/velocity score, score floor
- [x] Scene metrics + share card kind `rising_star`
- [x] Demo seeds late-joiner **Barbara Liskov** (~20 commits after ~65% of history) without overtaking founding lead
- [x] Unit tests: demo pick, synthetic late dense star, early-cast skip (42 unit tests total)

## Failed-job retry (2026-08-03)
- [x] Pure `planRetryJob` + `enqueueRetry` (`src/lib/jobs/retry.ts`)
- [x] `POST /api/repos/[slug]/retry` — github re-clone / local reanalyze; 409 if in-flight
- [x] JobStatusPanel **Retry analysis** button (polls new job; demo not retryable)
- [x] Unit tests for planner (7) + e2e API guards (demo/missing slug)
- [x] 49 unit tests total

## Notes
- Classic Story deck kept as secondary chronological slides
- Rising star requires ≥3 contributors, ≥20 commits, late firstCommit, score floor — skipped when weak
- Wrapped player remains intentionally dark cinematic; product shell is light-first
- Optional dark theme still available via toggle (storage key `gitchronicle-theme`)
- Demo projects reject retry (re-seed with `pnpm seed`); GitHub failed jobs re-clone after cleanup

## Marketing screenshots (2026-08-03)
- [x] `pnpm screenshots` → `scripts/capture-screenshots.ts` (Playwright, light theme forced)
- [x] Regenerated all `docs/screenshots/*` post Spotify rebrand + rising-star (22 scenes)
- [x] README badge green `#1DB954`; Wrapped image points at `wrapped-open.png`
- [x] Fixed Wrapped title visibility: `gc-title-shine` no longer uses `background-clip:text` (was invisible under transforms / Chromium capture)

## Light-theme chart contrast (2026-08-03)
- [x] Shared Recharts theme (`src/components/charts/theme.ts`) — axis/grid/tooltip use CSS tokens + popover-foreground
- [x] Multi-series: `--chart-2` is blue `#509bf5` (not near-identical green) on light and dark
- [x] Growth chart legend; empty states; heatmap empty-tile ring + Less/More legend
- [x] Theme tests assert chart-2 ≠ chart-1 (52 unit tests total)

## Stale running-job recovery (2026-08-03)
- [x] Pure `isJobStale` / heartbeat age (`src/lib/jobs/stale.ts`) — TTL 20m since last `updatedAt`
- [x] `recoverStaleJobs()` marks job + project failed with retry-friendly message
- [x] Wired into worker loop, `processNextJob`, `processJobById`, job poll API, and `enqueueRetry`
- [x] Unit tests for stale pure logic (60 unit tests total)

## Landing recent-repos dedupe (2026-08-03)
- [x] Pure `dedupeProjectsForDisplay` / `projectIdentityKey` (`src/lib/projects/dedupe.ts`)
- [x] Landing + repo switcher use `listProjectsForDisplay` (prefer ready, then newest)
- [x] `pnpm analyze` reuses project by normalized `localPath` (no more gitchronicle-N spam)
- [x] Local path shown on recent list; unit tests (69 total)

## Large-repo analysis performance (2026-08-03)
- [x] `git log` format omits commit body (`%b`) — subject-only categorization, far smaller stdout
- [x] `gitExec` buffers stdout/stderr as chunk arrays (no quadratic string concat)
- [x] Single chronological sort in `analyzeRepository`; file/contributor/growth skip re-sort
- [x] Co-change caps: `MAX_COCHANGE_PAIRS` (40k) + `MAX_COCHANGE_FILES_PER_COMMIT` (24)
- [x] Unit tests for caps + wide synthetic history (73 tests total)

## Orphan project status repair (2026-08-03)
- [x] Pure `planOrphanProjectRepair` (`src/lib/jobs/orphans.ts`)
- [x] Stuck pending/cloning/analyzing + terminal/missing job → ready or failed
- [x] Folded into `recoverStaleJobs()`; also runs on landing/switcher list
- [x] Unit tests (79 total)

## Suggested next (priority)
1. Optional: re-run `pnpm screenshots` after chart contrast for docs/overview
2. Optional: admin cleanup to delete superseded duplicate project rows
3. Optional: stream/parse git log incrementally for multi‑GB histories
4. Publication check: full e2e + local analyze smoke; consider loop stop if bar met
