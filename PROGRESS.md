# GitChronicle Progress

## Product: GitChronicle Wrapped

**Tagline:** Your repository had a year. Let’s replay it.

Primary experience is a cinematic, adaptive multi-scene Wrapped story from real Git analysis. Analytics dashboard is the deep dive after the story.

## Publication status — READY (2026-08-03)

Verified end-to-end:

| Check | Result |
| --- | --- |
| `pnpm lint` / `typecheck` / `test` / `build` | pass (99 unit tests) |
| `pnpm test:e2e` | **16/16** pass (desktop + mobile, production server) |
| Demo Wrapped | **16** adaptive scenes, one composition each, analysis-backed |
| Console errors | none across 10 routes in light **and** dark |
| Local analyze | reuses project by path; Wrapped **200** |
| Markdown export | non-empty report (Overview) |
| Share PNG | e2e magic-byte verified |
| Marketing screenshots | refreshed via `pnpm screenshots` |

No high-priority unfinished product work remains. Remaining ideas are optional stretch (admin DB cleanup, streaming git log).

## Foundation (MVP — complete)
- [x] Next.js App Router + TypeScript strict + Tailwind + SQLite/Drizzle
- [x] Git parse → pure metrics → persisted JSON
- [x] Demo seed, local CLI analyze, GitHub HTTPS import
- [x] Dashboard sections + Markdown export + Docker + tests spine

## Wrapped Phase A–C — complete
- [x] Story engine, cinematic player, share cards, landing, e2e
- [x] Rising star; retry; stale/orphan recovery
- [x] Recent-repos dedupe; large-repo perf; chart contrast; screenshots

## Design pass — "Warm Press" (complete)
- [x] Light-first token system: warm paper, near-black ink, six saturated accents, hue-separated chart series
- [x] Removed the borrowed streaming-brand greens; `design-system.test.ts` guards contrast, hues, palette balance and reduced motion
- [x] Motion system: nine entrances, per-scene-type transitions, staggered reveals, animated numerals, ambient drift, press feedback — all transform/opacity/clip only
- [x] Wrapped rebuilt as 16 distinct compositions via `SceneStage` (dial, ranked rows, colour fields, monogram, receipt, mosaic, share wall…)
- [x] Editorial landing: display hero, marquee ticker, ranked repo list, dark feature section
- [x] Dashboard aligned: masthead, ruled `Section`s, flat panels, custom charts and tables
- [x] Reviewed at 1440×900 / 1280×720 / 390×844 in light, dark and reduced-motion; long names and sparse repos included

## Continuous-improvement log (2026-08-03)
- Visual identity, rising star, failed-job retry, screenshots
- Chart contrast, stale jobs, project dedupe, large-repo perf, orphan repair
- Publication verification + screenshot refresh
- Light-first redesign; fixed dark-theme hydration mismatch, heatmap ramp,
  amber chart contrast, dial label clipping, closing-CTA fold, mobile ambient blur

## Deploy + public hardening (complete)
- [x] Railway/Fly/Render path documented; `railway.json`, boot-time migrate+seed entrypoint
- [x] Fixed a Dockerfile that did not build (glibc), a missing `.dockerignore` (dev DB + `.env` leaked into the image), corepack crash as non-root, port-blind healthcheck
- [x] Per-IP rate limits, global analysis concurrency cap, total clone-disk budget
- [x] Clones deleted after analysis — previously unbounded volume growth
- [x] CSP + security headers; generic error responses on public endpoints

## Optional later (not blocking)
1. Admin cleanup of superseded duplicate project rows
2. Stream/parse git log for multi‑GB histories
3. Per-commit author histograms for richer rising-star curves
4. Multi-forge imports beyond public HTTPS GitHub
5. Force-directed layout for the co-change graph
6. Redis-backed rate limits (only needed if the app ever runs >1 replica)
7. Scheduled `pnpm cleanup --purge-failed` to prune failed imports
