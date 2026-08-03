# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through
[GitHub Security Advisories](https://github.com/erikkostashuk/gitchronicle/security/advisories/new).
If that is unavailable to you, open a normal issue that says only "security
report, please contact me" — with no details — and a maintainer will arrange a
private channel.

Please include:

- what an attacker can do, and what access they need to do it
- steps to reproduce (a repository URL or payload is ideal)
- the version or commit you tested, and how you ran it (local, Docker, Railway)

**Expectations.** This is a small volunteer-maintained project. Expect an
acknowledgement within 7 days and a fix or a documented decision within 90 days
for confirmed issues. Please give us that window before disclosing publicly.
Credit is given in the release notes unless you prefer otherwise.

## Supported versions

| Version | Supported |
| --- | --- |
| `main` and the latest release | ✅ |
| Older releases | ❌ — upgrade to the latest |

There is no long-term-support branch. Fixes land on `main` and ship in the next
release.

## Threat model

GitChronicle analyses **public Git history**. It stores no user accounts, no
credentials, and no private repository content. The realistic risks are:

1. **Command injection** via a crafted repository URL reaching `git`
2. **Resource exhaustion** — a huge or malicious repository filling the disk or
   pinning the CPU
3. **Path traversal** — writing or reading outside the data directory
4. **Information disclosure** — server paths or dependency internals leaking
   into user-facing error messages

### What the code does about each

**Command injection.** Every `git` invocation goes through
`gitExec()` in `src/lib/git/exec.ts`, which uses `spawn("git", args)` with an
argument array and **no shell**. Import URLs must be public HTTPS `github.com`
URLs; owner and repo names are charset-restricted to `[A-Za-z0-9_.-]` and may
not begin with `-` or be `.`/`..`, so nothing `git` would read as an option or a
path segment survives. The clone URL is then **rebuilt from the validated
parts** rather than passed through, so query strings and fragments never reach
`git` either. URLs carrying embedded credentials are rejected outright rather
than silently stripped. Other transports (`git://`, `ssh://`, `file://`,
`ext::`) and look-alike hosts (`github.com.evil.tld`) are rejected.
`GIT_TERMINAL_PROMPT=0` prevents credential prompts from hanging a job. See
`src/lib/security/security.test.ts`.

**Resource exhaustion.** Clones and analysis both run under timeouts
(`CLONE_TIMEOUT_MS`, `ANALYZE_TIMEOUT_MS`). Clone size (`MAX_CLONE_SIZE_MB`),
total retained clone bytes (`MAX_TOTAL_CLONE_MB`), commit count (`MAX_COMMITS`),
subprocess output buffer, graph nodes/edges (`MAX_GRAPH_NODES`,
`MAX_GRAPH_EDGES`), timeline samples, and co-change pair counts are all bounded.
Concurrent analyses are capped (`MAX_CONCURRENT_ANALYSES`, default 1) and
imports are rate limited per client IP (`IMPORT_RATE_LIMIT`).

**Path traversal.** Clones land in a staging directory under
`$DATA_DIR/tmp`, are size-checked, then atomically renamed into
`$DATA_DIR/repos/<generated-project-id>`. Project IDs are server-generated, never
derived from user input, so a caller cannot steer the destination path. Failed
clones are removed.

**Information disclosure.** Rejected URLs raise a typed
`InvalidRepositoryUrlError` whose message is written for the user
("Only github.com repositories are supported"), and that message is what the
`400` body contains — never a validation-library issue dump. Every other failure
is replaced with a generic message and logged server-side. `/api/health` does
the same, so a database error cannot reveal the data directory path.

### Known limitations — read before running a public instance

- **The import endpoint is unauthenticated by design.** Rate limits are a speed
  bump, not a wall: `X-Forwarded-For` is spoofable and a distributed caller can
  still queue work. Put the app behind auth or a platform WAF if that matters.
- **Rate limiting is in-process.** Accurate at one replica; wrong at more than
  one. SQLite plus a single volume does not scale horizontally anyway.
- **Everything is public to everyone on the instance.** Any repository someone
  analyses is visible to every other visitor. Do not analyse private or
  sensitive repositories on a shared deployment.
- **`git clone` fetches attacker-influenced data.** Clones are unauthenticated
  and never checked out beyond the default branch, but the safest posture for a
  public instance is still an isolated container with a disk quota.
- **Analysis output embeds commit metadata**, including author names and email
  addresses from the repository's history, and renders them in the UI and
  exports. That data is already public in the upstream repository, but it is
  copied into your database.

## Response headers

The app sets a restrictive Content Security Policy (`default-src 'self'`, no
third-party origins), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `Permissions-Policy`, and HSTS in production.
`X-Powered-By` is disabled. See `next.config.ts`.

## Secrets

GitChronicle needs **no API keys or secrets to run**. Nothing in
`.env.example` is sensitive. If you add an integration that does require a
secret, keep it server-side, never prefix it with `NEXT_PUBLIC_`, and never
commit `.env`.
