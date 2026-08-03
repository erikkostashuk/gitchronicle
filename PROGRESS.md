# GitChronicle Progress

## Product: GitChronicle Wrapped

**Tagline:** Your repository had a year. Let’s replay it.

Primary experience is a cinematic, adaptive multi-scene Wrapped story from real Git analysis. Analytics dashboard is the deep dive after the story.

## Publication status — READY (2026-08-03)

Verified end-to-end:

| Check | Result |
| --- | --- |
| `pnpm lint` / `typecheck` / `test` / `build` | pass (79 unit tests) |
| `pnpm test:e2e` | **16/16** pass (desktop + mobile) |
| Demo Wrapped | 22 adaptive scenes (incl. rising star), analysis-backed |
| Local analyze | reuses project by path; Wrapped **200** |
| Markdown export | non-empty report (Overview) |
| Share PNG | e2e magic-byte verified |
| Marketing screenshots | refreshed via `pnpm screenshots` (post chart contrast) |

No high-priority unfinished product work remains. Remaining ideas are optional stretch (admin DB cleanup, streaming git log).

## Foundation (MVP — complete)
- [x] Next.js App Router + TypeScript strict + Tailwind + SQLite/Drizzle
- [x] Git parse → pure metrics → persisted JSON
- [x] Demo seed, local CLI analyze, GitHub HTTPS import
- [x] Dashboard sections + Markdown export + Docker + tests spine

## Wrapped Phase A–C — complete
- [x] Story engine, cinematic player, share cards, landing, e2e
- [x] Spotify-adjacent light theme; rising star; retry; stale/orphan recovery
- [x] Recent-repos dedupe; large-repo perf; chart contrast; screenshots

## Continuous-improvement log (2026-08-03)
- Visual identity, rising star, failed-job retry, screenshots + title shine
- Chart contrast, stale jobs, project dedupe, large-repo perf, orphan repair
- Publication verification + screenshot refresh

## Optional later (not blocking)
1. Admin cleanup of superseded duplicate project rows
2. Stream/parse git log for multi‑GB histories
3. Per-commit author histograms for richer rising-star curves
4. Multi-forge imports beyond public HTTPS GitHub
