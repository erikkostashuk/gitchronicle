# GitChronicle v1.0.0

**Your repository had a year. Let's replay it.**

GitChronicle turns a Git repository into a cinematic, shareable recap — then a
deep engineering-intelligence dashboard. This is the first public release.

**Try it:** <https://gitchronicle.up.railway.app>

---

## What it does

Point it at a repository and it replays that repository's life as a
full-screen story: when the work happened, who showed up, what the codebase
became, and the plot twists in between. When the story ends, the same analysis
backs a dashboard for the deeper questions — where the churn concentrates, which
files only one person understands, how growth actually curved.

**Three ways in, none of which need an API key:**

| Source | How |
| --- | --- |
| Bundled demo | `pnpm seed`, then **Play bundled Wrapped** — fully offline |
| Local repository | `pnpm analyze -- /absolute/path/to/repo` |
| Public GitHub repository | Paste an `https://github.com/owner/repo` URL |

## Highlights

**A story, not a slideshow.** Up to 16 adaptive scenes, each with its own
composition rather than one template with swapped numbers — a colossal numeral
for the headline, a 24-hour radial dial for rhythm, a ranked ensemble for
contributors, a proportional colour field for languages, a share-card wall to
close. Scenes adapt to the repository: a solo project doesn't get a
collaboration scene it can't fill.

**Deterministic personality.** Every repository gets a personality
(The Night Owl, The Weekend Builder, The Phoenix, The Feature Factory, and
others) computed from commit timing, cadence, and composition. The same
repository always produces the same result, and nothing is sent to a
third-party service.

**A real dashboard underneath.** Overview, Time Machine, Hotspots, People,
Evolution, Graphs, and Releases — plus PNG share cards and a Markdown
repository report.

**Built to be run by someone else.** SQLite and a data directory, no external
database, no queue, no API keys. `docker compose up --build` works; so does a
Railway service with a volume.

## Installing

Requires **Node.js 22+**, **pnpm 10+**, and **`git` on PATH**.

```bash
git clone https://github.com/erikkostashuk/gitchronicle.git
cd gitchronicle
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm seed
pnpm dev
```

Open <http://localhost:3000> and pick **Play bundled Wrapped**.

Deployment instructions for Docker, Railway, Fly, and Render are in the
[README](../README.md#deploying-railway--fly--render).

## Safety notes for public instances

The import endpoint is **unauthenticated by design**, so read
[SECURITY.md](../SECURITY.md) before exposing an instance to the internet. The
short version:

- `git` only ever runs through argument-array `spawn` — never a shell — and
  clone URLs are rebuilt from validated `owner`/`repo` parts
- Clone and analysis run under timeouts, with bounds on repository size, commit
  count, subprocess output, graph complexity, and co-change pairs
- Per-IP rate limiting, a concurrent-analysis cap, and a disk budget gate admission
- Rate limiting is **in-process**, so run exactly one replica
- Every repository anyone analyses is visible to everyone else on that instance

## Known limitations

- **Single replica only.** SQLite plus one attached volume does not scale
  horizontally. `railway.json` pins `numReplicas: 1`.
- **Needs a writable disk and the `git` binary**, so serverless platforms are
  not a target.
- **Public HTTPS GitHub URLs only** for remote import. Private repositories,
  other hosts, and SSH remotes are not supported — analyse them locally instead.
- **Very large repositories are bounded, not streamed.** Analysis stops at
  `MAX_COMMITS` (default 50,000) and clones above `MAX_CLONE_SIZE_MB` are
  rejected rather than partially processed.
- **Author identity is taken at face value** from Git metadata. Contributors who
  commit under several emails appear as several people unless `.mailmap`
  resolves them.
- **Analysis copies public commit metadata**, including author names and email
  addresses, into your database and renders it in the UI and exports.

## Verified for this release

| Check | Result |
| --- | --- |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | 111 pass |
| `pnpm build` | pass |
| `pnpm test:e2e` | 16 pass (desktop + mobile) |
| Docker image build + `/api/health` | pass |
| Clean-clone install → migrate → seed → run | pass |

## Contributing

Start with [CONTRIBUTING.md](../CONTRIBUTING.md) — it covers the project
structure, the analysis data flow, and step-by-step recipes for adding a metric,
a Wrapped scene, a migration, a test, and a visualization.

## License

[MIT](../LICENSE)
