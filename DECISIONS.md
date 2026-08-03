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
- Precomputed analysis JSON for a synthetic “Acme Toolkit” repository lives under `data/demo/`.
- `pnpm seed` inserts the demo project into SQLite so the UI works offline with no Git clone.
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

## No AI / no auth / no paid services
- Deterministic keyword + conventional-commit categorization only.
- Single-user self-host model; no multi-tenant auth.

## Tradeoffs
- Rename detection relies on `git log --follow` / rename detection flags where practical; not perfect for all cases.
- Ownership is approximate (lines/commits by path), not blame-accurate.
- Bus-factor is a simple ownership-concentration heuristic.
- Remote GitHub clone may be blocked in sandboxed CI; demo + local analyze are the reliable paths.

## Deployment packaging
- Prefer `pnpm start` (`next start`) over Next `output: "standalone"`. Docker already copies `node_modules` + `.next` and native `better-sqlite3` is simpler without the standalone file-trace subset. Standalone was removed after Next 16 warned that `next start` does not work with that mode.
