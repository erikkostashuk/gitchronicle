# GitChronicle Progress

Prioritized checklist for the overnight autonomous build.

## Phase 1 — Scaffold & tooling
- [x] Next.js App Router + TypeScript strict + Tailwind + pnpm
- [x] Core dependencies (Drizzle, Zod, Recharts, React Flow, Radix, Vitest, Playwright)
- [x] PROGRESS.md + DECISIONS.md
- [x] Env validation, logging, health endpoint
- [x] SQLite + Drizzle schema + migrations
- [x] Package scripts (dev, build, lint, typecheck, test, e2e, migrate, seed, analyze, worker, cleanup)
- [x] Initial git commits

## Phase 2 — Analysis engine
- [x] Git process execution (argument-array spawn, timeouts)
- [x] Raw Git parsing (log, numstat, renames, tags)
- [x] Metric calculations (activity, churn, ownership, co-change, eras, categories)
- [x] Vitest coverage for parse + metrics (25 tests)
- [x] Bundled demo dataset + `pnpm seed`

## Phase 3 — Persistence & jobs
- [x] DB schema for projects, analyses, jobs
- [x] Background worker + job status polling
- [x] CLI `pnpm analyze` and `pnpm cleanup`
- [x] Demo loads from DB without credentials

## Phase 4 — Product UI
- [x] Landing page (premium developer-tool aesthetic)
- [x] Dashboard shell (themes, nav, repo switcher, command palette)
- [x] Overview section
- [x] Time Machine section
- [x] Hotspots section (sort + path search)
- [x] People section
- [x] Evolution section
- [x] Graphs section
- [x] Releases section
- [x] Story section
- [x] Markdown exports (release notes + repository report)

## Phase 5 — Ingestion
- [x] GitHub HTTPS URL validation + safe clone
- [x] Progress UI for clone/analyze
- [x] Local path ingest via CLI
- [x] Failure cleanup of partial data

## Phase 6 — Ops & quality
- [x] Playwright e2e specs (demo, import, nav, export)
- [x] Docker + Docker Compose + healthcheck
- [x] README, LICENSE, CONTRIBUTING, .env.example
- [x] `pnpm lint`, `typecheck`, `test`, `build` pass

## Phase 7 — Polish & verify
- [x] Run Playwright e2e against live server (12/12 pass)
- [x] Analyze real local repository via CLI (`gitchronicle-1`, truthful metrics)
- [x] Optional public GitHub import smoke test (hello-world ready)
- [x] Final verification captures under scratch
- [x] Screenshots in `docs/screenshots/` wired into README
- [x] Narrative pluralization + timeline tree dedupe + hotspot search
- [x] All acceptance criteria satisfied
