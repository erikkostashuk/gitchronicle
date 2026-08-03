# FINAL_AUDIT — GitChronicle Wrapped

**Date:** 2026-08-03  
**Product:** GitChronicle Wrapped — cinematic repository recap  
**Tagline:** Your repository had a year. Let’s replay it.

## Startup (local)

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm seed
pnpm dev
```

- Demo Wrapped: [http://localhost:3000/demo](http://localhost:3000/demo) → `/repo/acme-toolkit/wrapped`
- Local analyze: `pnpm analyze -- /absolute/path/to/repo` → open printed `/repo/<slug>/wrapped`
- Deep analytics: `/repo/<slug>` after the story

## Validation results

| Check | Result |
| --- | --- |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | 49 pass (parse + metrics + wrapped + rising-star + retry planner + theme) |
| `pnpm build` | pass |
| `pnpm test:e2e` | **16 pass** (desktop + mobile), including hard keyboard advance + closing scroll + PNG magic + retry API |
| Demo Wrapped | 21 adaptive scenes, analysis-backed |
| Local CLI analyze | ready project + Wrapped 200 |
| Markdown export | non-empty report with Overview |
| PNG share cards | recap landscape ~900KB+, PNG signature verified |
| Invalid GitHub URL | 400 |

### Skeptic fixes (2026-08-03)

- Scene body is `flex-1 min-h-0 overflow-y-auto` so closing CTAs/share cards scroll on 390×844
- Wrapped route sits **outside** dashboard `(app)` layout (no chrome intercepting pointers)
- Playwright webServer uses **production** `pnpm build && pnpm start` (Turbopack dev HMR can leave Client Components inert)
- e2e hard-asserts keyboard `1/→2/`, closing tab, scroll `overflow-y`, PNG download

## Architecture

```
Git (spawn argv) → parse → pure metrics (AnalysisResult)
                              ↓
                    buildWrappedStory()  [pure]
                              ↓
                    WrappedPlayer + share PNG canvas
                              ↓
                    Dashboard sections (unchanged spine)
```

### Personality rules (deterministic, first match)

Documented in `src/lib/wrapped/personality.ts`:

1. **The Phoenix** — quiet ≥ 30 days with continued activity  
2. **The Night Owl** — peak hour 22–05 UTC  
3. **The Weekend Builder** — ≥ 35% weekend commits  
4. **The Relentless Refactorer** — ≥ 25% refactor category  
5. **The Feature Factory** — ≥ 40% feature category  
6. **The Steady Ship** — density ≥ 0.55 and age ≥ 60 days  
7. **The Carefully Curated Monolith** — ≥ 80 files, ≤ 3 contributors  
8. **The Fast-Moving Experiment** — age ≤ 45 days, ≥ 40 commits  
9. **First Light** — ≤ 3 commits  
10. Default **The Steady Ship**

No AI APIs.

### Scene selection

`buildWrappedStory` emits only scenes with enough data (solo repos skip people/collaboration/releases; tiny repos still get opening → recap → closing). Demo Acme Toolkit yields **21** scenes.

## Screenshots

Captured under `docs/screenshots/` and e2e `test-results` / session scratch `shots/`.

## Limitations

- Ownership is commit-share approximate, not blame-accurate  
- Rename detection is best-effort via Git  
- Graph nodes/edges and timeline samples are capped  
- PNG share cards render client-side (canvas); fonts are system-ui  
- Remote GitHub clone is secondary; demo + local analyze are the spine  
- Classic Story deck remains as a secondary chronological view  

## Deferred (not blocking)

- SSE streaming progress  
- Light-theme-specific Wrapped *scene* palettes (player is intentionally dark cinematic; shell is light-first with green brand as of 2026-08-03)  
- Per-commit author split histograms for even richer rising-star curves (current pure picker uses first/last + density)  
- Multi-forge imports beyond public HTTPS GitHub  
- (done) Fresh marketing screenshots via `pnpm screenshots` after Spotify-adjacent rebrand  
 
