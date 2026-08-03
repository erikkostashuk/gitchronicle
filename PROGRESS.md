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
- [x] e2e for Wrapped nav + exports (**14/14**, hard keyboard + closing + PNG)
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

## Notes
- Classic Story deck kept as secondary chronological slides
- Rising star scene only when late-joining contributor signal is strong
- Wrapped player remains intentionally dark cinematic; product shell is light-first
- Optional dark theme still available via toggle (storage key `gitchronicle-theme`)

## Suggested next (priority)
1. Re-run e2e on production build after visual pass; refresh `docs/screenshots/` if stale
2. Light-theme dashboard chart colors pass (recharts still fine; verify contrast)
3. Rising-star refinement from fuller late-join heuristics
4. Performance pass on very large local repos (caps already exist — measure)
