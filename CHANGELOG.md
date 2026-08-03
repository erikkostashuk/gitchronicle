# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet. See the [roadmap](./README.md#roadmap) for what's planned.

## [1.0.0] — 2026-08-03

First public release. Everything below already shipped in the
[hosted demo](https://gitchronicle.up.railway.app); this release makes the
source public with the documentation, CI, and policies to match.

### Added

**Wrapped story**

- Cinematic Wrapped player with up to 16 adaptive full-screen scenes, each with
  its own composition rather than one template with swapped numbers
- Deterministic repository personality (The Night Owl, The Weekend Builder,
  The Phoenix, The Feature Factory, …) computed from Git history — no external
  service
- Streak, rhythm, contributor-ensemble, language-field, plot-twist,
  rising-star, and share-card scenes
- Autoplay with keyboard (`← →`, `Home`/`End`, `P`), tap-the-edges, and swipe
  navigation; full `prefers-reduced-motion` support that keeps every end state
- PNG share cards rendered client-side

**Dashboard**

- Overview — repository age, commit totals, contribution heatmap, eras, narrative
- Time Machine — play and scrub sampled repository history
- Hotspots — churn, ownership concentration, bus-factor risk
- People — contributor profiles, working hours, collaboration
- Evolution — growth curves, bursts, quiet periods
- Graphs — co-change and collaboration graphs (bounded node/edge counts)
- Releases — tags with generated Markdown release notes
- Markdown repository report export

**Ingestion and analysis**

- Public HTTPS GitHub URL import with background job processing
- Local repository analysis via `pnpm analyze -- <path>`
- Bundled offline demo project (Acme Toolkit) — no network or credentials needed
- Deterministic, pure metric calculators kept independent of the UI
- SQLite persistence via Drizzle ORM; the UI never runs `git` during render

**Operations and safety**

- `git` executed exclusively through argument-array `spawn` — never a shell
- Strict GitHub URL validation; clone URLs rebuilt from validated parts
- Timeouts on clone and analysis; bounds on repository size, commit count,
  subprocess output, graph complexity, timeline samples, and co-change pairs
- Per-IP import rate limiting, concurrent-analysis cap, and disk-budget
  admission control for public instances
- Job recovery for stale running jobs and orphaned project statuses
- `/api/health` endpoint, Dockerfile, `docker-compose.yml`, and `railway.json`
  with volume-backed persistence
- Content Security Policy and hardening headers; `X-Powered-By` disabled

**Project**

- MIT license, contribution guide, code of conduct, and security policy
- GitHub Actions CI: lint, typecheck, unit tests, build, Playwright e2e, and a
  Docker image build with a health smoke test
- Issue and pull request templates
- 111 unit tests (Vitest) and 16 end-to-end tests (Playwright, desktop + mobile)

### Security

- Repository URL validation now raises a typed `InvalidRepositoryUrlError`
  carrying a written-for-humans message. Rejections previously serialised the
  validation library's raw issue array into the public `400` body, exposing
  internal schema shape; they now return a single clean sentence
- URLs carrying embedded credentials (`https://token@github.com/…`) are rejected
  outright rather than silently stripped, so nobody can believe a pasted token
  authenticated their clone
- Owner and repository names that `git` could read as options (`-upload-pack`,
  `--help`) or as path segments (`.`, `..`) are rejected explicitly
- Import failures other than validation are logged server-side and answered with
  a generic message, so server paths and dependency internals cannot leak
- `/api/health` returns a generic body on failure so a database error cannot
  leak the absolute data-directory path

### Known limitations

See [SECURITY.md](./SECURITY.md#known-limitations--read-before-running-a-public-instance)
and the [README](./README.md#limitations). In short: the import endpoint is
unauthenticated by design, rate limiting is in-process and therefore
single-replica only, and every analysed repository is visible to every visitor
on the instance.

[Unreleased]: https://github.com/erikkostashuk/gitchronicle/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/erikkostashuk/gitchronicle/releases/tag/v1.0.0
