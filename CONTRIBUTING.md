# Contributing to GitChronicle

Thanks for helping improve GitChronicle.

## Development setup

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/lib/git` | Process execution, clone, validation, parsing |
| `src/lib/analysis` | Pure metric calculation |
| `src/lib/db` | SQLite schema and client |
| `src/lib/jobs` | Background job worker |
| `src/components` | UI components |
| `src/app` | App Router pages and API routes |
| `scripts` | CLI entrypoints |
| `e2e` | Playwright tests |

## Guidelines

- Prefer small, focused pull requests.
- Keep the analysis engine independent of the UI.
- Never shell-interpolate untrusted input; use argument arrays for `git`.
- Cover parsing and metric changes with Vitest.
- Run before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Optional: `pnpm test:e2e` (requires Playwright browsers).

## Commit style

- Use clear, descriptive commit messages.
- Attribute commits with your own Git author identity.
- Do not add AI co-author trailers unless the project explicitly requests them.

## Security

Report vulnerabilities privately when possible. Do not open public issues that include exploit details for unfixed problems.
