## What this changes

<!-- One or two sentences. Link the issue it closes: Closes #123 -->

## Why

<!-- The user-facing problem, or the reason the change is worth its complexity. -->

## How to verify

<!-- Exact steps a reviewer can follow, e.g. `pnpm seed && pnpm dev`, then open /repo/acme-toolkit/wrapped -->

## Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Parsing / metric changes are covered by Vitest
- [ ] No secrets, tokens, personal paths, or private URLs added
- [ ] Untrusted input is never shell-interpolated (`git` runs via argument arrays)
- [ ] Docs updated (README / CONTRIBUTING / `.env.example`) if behaviour or setup changed
- [ ] Screenshots attached for UI changes

## Screenshots

<!-- Before / after for any visual change. Light and dark theme if relevant. -->
