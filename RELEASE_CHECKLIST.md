# Release Checklist

Run through this before tagging any release. Every command assumes a clean
working tree on `main` with dependencies installed.

## 1. Clean-checkout verification

The single most valuable check — it catches "works on my machine" setups.

```bash
git clone https://github.com/erikkostashuk/gitchronicle.git /tmp/gc-release
cd /tmp/gc-release
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:migrate
pnpm seed
pnpm dev
```

- [ ] Install succeeds with a frozen lockfile
- [ ] `http://localhost:3000` loads and **Play bundled Wrapped** works end to end
- [ ] No API keys or manual steps were needed beyond the commands above

## 2. Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

- [ ] Lint clean
- [ ] Typecheck clean
- [ ] Unit tests pass
- [ ] Production build succeeds
- [ ] Playwright e2e passes (desktop + mobile)
- [ ] CI is green on the release commit

## 3. Ingestion

- [ ] Bundled demo renders a full Wrapped story with analysis-backed scenes
- [ ] Local analyze works: `pnpm analyze -- /absolute/path/to/a/repo`
- [ ] Public GitHub import works from the landing page
- [ ] An invalid URL returns `400` with a readable message
- [ ] A non-GitHub or non-HTTPS URL (`git://`, `ssh://`, `file://`) is rejected
- [ ] Markdown export produces a non-empty report
- [ ] PNG share card downloads

## 4. Container and deployment

```bash
docker compose up --build
```

- [ ] Image builds
- [ ] `/api/health` returns `{"ok":true}`
- [ ] Demo project is present on first boot (entrypoint migrates and seeds)
- [ ] A restart preserves data when a volume is mounted at `/app/data`
- [ ] Nothing in the image depends on local or uncommitted files

## 5. Security sweep

- [ ] `git log --all --diff-filter=A --name-only --pretty=format: | sort -u` shows no `.env`, database, key, or credential files
- [ ] `.env` is not tracked; `.env.example` contains only safe placeholders
- [ ] No personal absolute paths, private URLs, or tokens in code, docs, or screenshots
- [ ] Screenshots show only the demo project or public repositories
- [ ] User-facing errors do not leak server paths or dependency internals
- [ ] `pnpm audit` reviewed (document accepted advisories)

## 6. Documentation

- [ ] README reflects what actually ships — no aspirational features
- [ ] Demo link resolves: <https://gitchronicle.up.railway.app>
- [ ] Screenshots regenerated if the UI changed (`pnpm screenshots`)
- [ ] `.env.example` covers every variable read by `src/lib/env.ts`
- [ ] Environment variable table in the README matches `.env.example`
- [ ] CHANGELOG has a dated entry for this version
- [ ] `docs/RELEASE_NOTES_v<version>.md` written
- [ ] Roadmap updated — shipped items removed, new ideas added

## 7. Version and tag

- [ ] `version` in `package.json` bumped
- [ ] CHANGELOG `[Unreleased]` section rolled into the new version with today's date
- [ ] Compare links at the bottom of CHANGELOG updated

```bash
git commit -am "chore: release v1.0.0"
git tag -a v1.0.0 -m "GitChronicle v1.0.0"
git push origin main --follow-tags
gh release create v1.0.0 --notes-file docs/RELEASE_NOTES_v1.0.0.md
```

## 8. Post-release

- [ ] Hosted demo redeployed and healthy
- [ ] Fresh clone of the tag passes step 1
- [ ] Repository description, topics, and social preview set on GitHub
- [ ] Issues and Discussions enabled; issue templates render correctly
- [ ] Branch protection on `main` requires the CI checks
