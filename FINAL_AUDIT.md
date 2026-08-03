# FINAL_AUDIT — GitChronicle Wrapped

**Date:** 2026-08-03 (light-first redesign pass)
**Product:** GitChronicle Wrapped — cinematic repository recap
**Tagline:** Your repository had a year. Let’s replay it.
**Status:** **Publication-ready**

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
| `pnpm test` | **85 pass** (parse + metrics + wrapped + jobs + dedupe + design system) |
| `pnpm build` | pass |
| `pnpm test:e2e` | **16 pass** (desktop + mobile) |
| Demo Wrapped | **16** adaptive scenes, analysis-backed |
| Sparse repo (`hello-world`) | 16 scenes, no empty visuals |
| Console errors (light + dark, 10 routes) | **none** |
| Markdown export | non-empty report with Overview |
| PNG share cards | recap landscape PNG signature verified in e2e |
| Invalid GitHub URL | 400 |
| Marketing screenshots | regenerated (`pnpm screenshots`) |

## Design system — "Warm Press"

Light is the product default; dark is a fully-supported opt-in shell.

| Token group | Values |
| --- | --- |
| Surfaces | `--paper #fbf7f1`, `--paper-sunk`, `--paper-raised` |
| Ink | `--ink #16130f` (≈17:1 on paper), `--ink-soft`, `--ink-faint` |
| Accents | coral `#ff4d2e`, cobalt `#2447f0`, teal `#0e9f8e`, amber `#f5a524`, plum `#7c3aed`, lime `#c9f03a` |
| Charts | six hue-separated series, each ≥2.4:1 on paper (`--chart-4` is deepened to `#c97a06` — bright amber only clears 1.9:1 and is too weak for thin marks) |
| Type | `gc-display`, `gc-numeral`, `gc-eyebrow`, `gc-mono`, `gc-underline` |

The previous theme used Spotify’s brand greens (`#1db954` / `#1ed760`) as the
product identity. Those are gone; `design-system.test.ts` fails the build if they
reappear.

### Motion system

- **Entrances** — `gc-in-rise`, `-drop`, `-left`, `-right`, `-zoom`, `-pop`, `-tilt`, `-wipe`, `-wipe-across`
- **Scene transitions** — chosen per scene *type* and index (`sceneTransition`), so consecutive beats never repeat the same move; stepping back always reverses
- **Reveals** — `gc-stagger` (index-based delays), `gc-bar-grow`, `gc-col-grow`, `gc-draw`
- **Ambient** — `gc-drift-a/b`, `gc-spin-slow`, `gc-breathe`, `gc-marquee`
- **Feedback** — `gc-press` (buttons), `gc-card-hover` (panels)
- **Numbers** — rAF `CountUp`, keyed by target so a scene change never shows a stale frame and SSR renders the final value
- **Reduced motion** — one global `@media (prefers-reduced-motion: reduce)` block collapses every animation and transition to 0.001ms and pins end states (`scaleX(1)`, drawn underlines, `stroke-dashoffset: 0`)

Everything animates on transform / opacity / clip-path only.

## Wrapped scene compositions

`SceneStage` routes each scene type to its own layout — no shared template:

| Layout | Scene types | Visual idea |
| --- | --- | --- |
| `OpeningStage` | opening | Repo name at display scale + ruled stat triptych |
| `BeginningStage` | beginning | Giant origin date + early-files slate |
| `HeadlineStage` | headline | Colossal numeral + monthly column chart |
| `BusiestStage` | busiest | Peak-day plaque + ±10-day column window |
| `SegmentStage` | favorites, commit_personality | Proportional colour field with an “Other” remainder |
| `RhythmStage` | rhythm | 24-hour radial dial, peak spoke in accent |
| `StreakStage` | streak | Run of day blocks, sized to streak length |
| `EnsembleStage` | people | Ranked rows with proportional accent bars |
| `PersonStage` | main_character, rising_star | Monogram portrait (+ ascending spark for rising star) |
| `FileStage` | busiest_file, dramatic_file | Mono path plate + diverging churn bar |
| `CommitStage` | giant_commit | Receipt-style commit card |
| `RailStage` | architecture, releases, collaboration, cochange | Vertical moment rail |
| `TwistStage` | plot_twist | Oversized type on a dark beat |
| `EmblemStage` | personality | Rotating emblem + reasons |
| `RecapStage` | recap | Six-tile tinted stat mosaic |
| `ClosingStage` | closing | CTAs above the fold, then a live share-card wall |

Palettes: 8 scene themes, 6 light / 2 dark, each declaring its own `ink`,
`inkSoft`, `rule`, `accent` and `onAccent` so contrast is never incidental
(`onAccent` vs `accent` is asserted >3:1 in tests).

Story length is now **16** scenes (`TARGET_MAX_SCENES`), with `rhythm` promoted
above `busiest_file`/`releases` so the coding-rhythm beat survives the budget.

## Responsive review

Reviewed at 1440×900, 1280×720 and 390×844, in light, dark and reduced-motion.

- Mobile is composed, not scaled: single column, one central idea per scene,
  stat labels wrap instead of truncating, share cards go two-up, swipe ignores
  mostly-vertical gestures so scrollable scenes still scroll
- Long repository names wrap in the dashboard masthead and reflow the stat strip
- Sparse repositories (2-commit local, `hello-world`) produce no empty visuals
- Closing is the only scene allowed to exceed one screen; the scroll lives on the
  scene body so CTAs and cards are both reachable

## Defects found and fixed in this pass

| Defect | Fix |
| --- | --- |
| Hydration mismatch on every route in dark theme | `ThemeToggle` rendered a theme-dependent `aria-label` the server could not know; the label is now theme-independent |
| Heatmap would have rendered solid black | `bg-primary` became ink under the new tokens; the heatmap now uses an explicit coral ramp |
| Chart amber at 1.9:1 on paper | `--chart-4` deepened to `#c97a06` (test-enforced ≥2.4:1) |
| Hour labels clipped out of the rhythm dial viewBox | viewBox widened to fit the label radius |
| Ranked-row values unreadable on mid-weight bars | non-leading bars capped at 40% tint |
| Language percentages disagreed with the headline stat | proportional fields fold the tail into an “Other” segment |
| Closing CTAs below the fold | CTAs moved above the share-card wall |
| File scene repeated its path in the subtitle | subtitle split; the plate owns the path |
| Hero numerals colliding with their labels | labels moved to their own line |
| `blur(90–110px)` on viewport-sized ambient layers | replaced with radial-gradient fields (cheaper on mobile, same look) |

## Architecture

```
Git (spawn argv) → parse → pure metrics (AnalysisResult)
                              ↓
                    buildWrappedStory()  [pure]
                              ↓
                  WrappedPlayer → SceneStage (per-type layout)
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

`buildWrappedStory` emits only scenes with enough data (solo repos skip
people/collaboration/releases; tiny repos still get opening → recap → closing),
then `trimScenesToBudget` keeps narrative order, pins the spine
(opening/headline/personality/recap/closing) and fills the rest by priority.

## Accessibility

- Full keyboard transport (`← →`, `Space`, `PageUp/Down`, `Home`, `End`, `P`)
- Scene rail is a real `tablist` with per-scene labels and `aria-current`
- Every scene carries an `sr-only` summary; charts expose `role="img"` + label
- Global 3px `:focus-visible` ring on the cobalt token
- Reduced motion honoured globally, and autoplay switches itself off

## Screenshots

`docs/screenshots/` — landing, six distinct Wrapped compositions, the closing
share wall and every dashboard section. Regenerate with `pnpm screenshots`
against a running server.

**Capture note:** take Wrapped frames on a fresh page. A prior `fullPage: true`
capture leaves Chromium's compositor mid-resize and offsets screenshots of
fixed-position overlays — the DOM is correct, the PNG is not.

## Deployment

Requires a container host with a persistent volume and the `git` binary —
**not** a serverless platform. Vercel cannot run this app as written: the
filesystem is read-only outside `/tmp` (SQLite writes fail), `git` is absent
from the function runtime, and analysis exceeds the 300s function ceiling.

Verified locally by building the image and running it against a genuinely empty
bind mount (which, unlike a Docker named volume, does not pre-copy image
contents — matching how Railway/Fly mount volumes):

| Check | Result |
| --- | --- |
| Image build | pass |
| Empty volume → migrate + seed on boot | 1 project (`acme-toolkit`), no dev data |
| `git --version` in runtime image | 2.47.3 |
| Live clone of a public repo via `POST /api/projects` | `ready` in <5s, Wrapped 200 |
| Restart with volume attached | both projects persisted |

### Docker defects found and fixed

| Defect | Fix |
| --- | --- |
| **Image did not build at all** — `better-sqlite3`'s prebuilt binding needs `GLIBC_2.38`; `node:22-bookworm-slim` ships 2.36 | base image moved to `node:22-trixie-slim` (glibc 2.41) |
| **No `.dockerignore`** — `COPY . .` baked the local dev SQLite database and `.env` into the build context, so a fresh deploy showed the developer's own projects | added `.dockerignore` excluding `data`, `.env*`, `node_modules`, `.next`, test output |
| Volume mounted at `DATA_DIR` shadows the image-baked database, leaving a deploy with no schema and no demo | `scripts/docker-entrypoint.sh` migrates + seeds at boot (both idempotent) |
| Runtime user's home is `/nonexistent`, so corepack tried to re-download pnpm and crashed on start | `COREPACK_HOME=/opt/corepack` staged world-readable at build; user given a real home |
| `HEALTHCHECK` hardcoded port 3000, failing on hosts that inject `PORT` | healthcheck reads `process.env.PORT` |
| `metadataBase` pinned to `http://localhost:3000` | derived from `APP_URL` / `RAILWAY_PUBLIC_DOMAIN` / `RENDER_EXTERNAL_HOSTNAME` |

## Public-instance hardening

Threat model: the app stores only analysis of public repositories, so the risk is
**abuse and resource exhaustion**, not data disclosure.

Input validation was already sound and is now regression-tested
(`src/lib/security/security.test.ts`): the clone URL is rebuilt from a
charset-restricted owner/repo, so query strings, credentials, fragments,
alternate transports (`ext::`, `file://`, `ssh://`) and look-alike hosts cannot
reach `git`, which is spawned with an argument array and no shell.

| Risk | Control |
| --- | --- |
| Import flood | Fixed-window per-IP rate limit on `POST /api/projects` and `…/retry` (5 / 10 min), counted *before* validation so probing also costs quota |
| Parallel clone storms | `MAX_CONCURRENT_ANALYSES` (default 1), enforced inside `runJob` so the HTTP route, worker loop, retry and CLI share one ceiling |
| **Disk exhaustion — clones were never deleted** | Clones are removed after successful analysis (`KEEP_CLONES=false`) and `localPath` is cleared so retry re-clones honestly; `MAX_TOTAL_CLONE_MB` refuses imports before the volume fills |
| Internal detail leakage | Non-validation errors log server-side and return a generic message |
| Clickjacking / injection / sniffing | CSP (`default-src 'self'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production, `X-Powered-By` removed |

Verified live: security headers present on `/`; the 6th import from one IP
returns 429; and in-container, importing `octocat/Hello-World` leaves
`/app/data/repos` at **0 bytes** while `/repo/hello-world/wrapped` still returns
200 — confirming the analysis result is self-contained.

**Residual risk (accepted):** the import endpoint is unauthenticated by design.
`X-Forwarded-For` is spoofable and a distributed caller can still queue work, so
rate limiting is a speed bump rather than a wall. All analysed repositories are
visible to every visitor. Both are acceptable for a public showcase; an instance
needing more requires auth or a platform WAF.

## Limitations

- Ownership is commit-share approximate, not blame-accurate
- Rename detection is best-effort via Git
- Graph nodes/edges and timeline samples are capped
- PNG share cards render client-side (canvas); fonts are system-ui
- Remote GitHub clone is secondary; demo + local analyze are the spine
- Classic Story deck remains as a secondary chronological view

## Deferred (not blocking)

- SSE streaming progress
- Per-commit author split histograms for richer rising-star curves
- Multi-forge imports beyond public HTTPS GitHub
- Force-directed layout for the co-change graph (currently a capped grid)
