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
- [x] e2e for Wrapped nav + exports (12/12)
- [x] FINAL_AUDIT.md
- [x] lint / typecheck / test / build green

## Notes
- Classic Story deck kept as secondary chronological slides
- Rising star scene only when late-joining contributor signal is strong
