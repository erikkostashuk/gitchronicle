import Link from "next/link";
import {
  ArrowRight,
  Clock,
  FileWarning,
  Network,
  Play,
  Sparkles,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ImportForm } from "@/components/import-form";
import { Button } from "@/components/ui/button";
import { listProjects, listProjectsForDisplay } from "@/lib/projects";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TICKER = [
  "total commits",
  "busiest day",
  "coding rhythm",
  "longest streak",
  "the ensemble cast",
  "hottest file",
  "boss-fight commit",
  "house language",
  "repository personality",
];

const FEATURES = [
  {
    icon: Play,
    title: "The story",
    body: "Up to sixteen adaptive full-screen scenes — each one a different composition, generated from real Git metrics.",
    tint: "var(--coral)",
  },
  {
    icon: Users,
    title: "People & ownership",
    body: "Contributor profiles, collaboration pairs, bus-factor signals, and a rising-star pick.",
    tint: "var(--cobalt)",
  },
  {
    icon: FileWarning,
    title: "Hotspots",
    body: "Churn, recency and ownership concentration with plain-language risk reasons.",
    tint: "var(--amber)",
  },
  {
    icon: Clock,
    title: "Time Machine",
    body: "Scrub sampled history with a living file tree after the recap ends.",
    tint: "var(--teal)",
  },
  {
    icon: Network,
    title: "Graphs",
    body: "Co-change constellations and collaboration maps — capped so large repos stay fluid.",
    tint: "var(--plum)",
  },
  {
    icon: Sparkles,
    title: "Share cards",
    body: "Download social PNGs for the recap, personality, streaks and more. No AI, no login.",
    tint: "var(--lime-deep)",
  },
];

export default function HomePage() {
  const allProjects = listProjects();
  const projects = listProjectsForDisplay(6);
  const demo = allProjects.find((p) => p.isDemo && p.status === "ready");

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="gc-grain relative overflow-hidden">
          <div
            aria-hidden
            className="gc-drift-a pointer-events-none absolute -right-[16%] -top-[36%] h-[44rem] w-[44rem] opacity-80"
            style={{
              background:
                "radial-gradient(closest-side,color-mix(in srgb,var(--coral) 30%,transparent),transparent 72%)",
            }}
          />
          <div
            aria-hidden
            className="gc-drift-b pointer-events-none absolute -left-[20%] top-[18%] h-[38rem] w-[38rem] opacity-70"
            style={{
              background:
                "radial-gradient(closest-side,color-mix(in srgb,var(--cobalt) 24%,transparent),transparent 72%)",
            }}
          />

          <div className="relative mx-auto max-w-[86rem] px-4 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
            <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-16">
              <div className="min-w-0 gc-stagger">
                <p className="gc-eyebrow flex items-center gap-2 text-[var(--coral-deep)] dark:text-[var(--coral)]">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full bg-current"
                  />
                  GitChronicle Wrapped
                </p>
                <h1 className="gc-display mt-5 text-[clamp(2.75rem,8.5vw,6.5rem)]">
                  Your repository
                  <br />
                  had a year.
                  <br />
                  <span className="gc-underline">Let’s replay it.</span>
                </h1>
                <p className="mt-7 max-w-[46ch] text-[clamp(1rem,1.6vw,1.3rem)] leading-relaxed text-muted-foreground">
                  A cinematic, data-true recap of how a codebase became itself —
                  commits, people, hotspots and eras, cut into a story worth
                  sharing. The deep analytics dashboard is waiting underneath.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg">
                    <Link href={demo ? `/repo/${demo.slug}/wrapped` : "/demo"}>
                      <Play className="h-4 w-4" />
                      Play the bundled Wrapped
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href={demo ? `/repo/${demo.slug}` : "/demo"}>
                      Open analytics demo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Import panel — the one raised surface on the page */}
              <div className="min-w-0">
                <div className="gc-card gc-grain relative overflow-hidden p-5 sm:p-6">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1.5 bg-[var(--coral)]"
                  />
                  <p className="gc-eyebrow mt-1 text-muted-foreground">
                    Chronicle a repository
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold tracking-tight">
                    Paste a public GitHub URL
                  </h2>
                  <div className="mt-4">
                    <ImportForm />
                  </div>
                  <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                    Local repositories:{" "}
                    <code className="gc-mono rounded bg-muted px-1.5 py-0.5 text-[0.72rem]">
                      pnpm analyze -- /path
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scene ticker */}
          <div
            className="gc-marquee relative overflow-hidden border-y py-3"
            aria-hidden
          >
            <div className="gc-marquee-track">
              {[0, 1].map((dup) => (
                <ul key={dup} className="flex shrink-0 items-center">
                  {TICKER.map((t) => (
                    <li
                      key={`${dup}-${t}`}
                      className="flex items-center gap-6 whitespace-nowrap px-6 text-[clamp(0.95rem,1.5vw,1.35rem)] font-extrabold uppercase tracking-tight"
                    >
                      {t}
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--coral)]" />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        {/* ── Recent repositories ─────────────────────────────── */}
        {projects.length > 0 && (
          <section className="mx-auto max-w-[86rem] px-4 py-14 sm:px-8">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[clamp(1.4rem,3vw,2.1rem)] font-extrabold tracking-tight">
                Recent repositories
              </h2>
              <span className="gc-eyebrow text-muted-foreground">
                {projects.length} tracked
              </span>
            </div>
            <ul
              className="mt-5 border-t"
              data-testid="recent-repos"
            >
              {projects.map((p) => (
                <li key={p.id} className="border-b">
                  <Link
                    href={
                      p.status === "ready"
                        ? `/repo/${p.slug}/wrapped`
                        : `/repo/${p.slug}`
                    }
                    className="group flex items-center justify-between gap-4 py-4 transition-colors hover:bg-foreground/4"
                  >
                    <span className="flex min-w-0 items-baseline gap-3 pl-1 sm:gap-5">
                      <span className="hidden shrink-0 text-sm font-bold tabular-nums text-muted-foreground sm:inline">
                        {String(projects.indexOf(p) + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[clamp(1rem,2.2vw,1.5rem)] font-extrabold tracking-tight">
                          {p.fullName || p.name}
                        </span>
                        {p.sourceType === "local" && p.localPath && (
                          <span className="gc-mono mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {p.localPath}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 pr-1">
                      {p.isDemo && <Badge variant="secondary">Demo</Badge>}
                      {p.sourceType === "local" && !p.isDemo && (
                        <Badge variant="outline">Local</Badge>
                      )}
                      <Badge
                        variant={
                          p.status === "ready"
                            ? "success"
                            : p.status === "failed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {p.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Dark feature section for contrast ───────────────── */}
        <section className="gc-grain relative overflow-hidden bg-[#16130f] py-16 text-[#faf6ee] sm:py-20">
          <div
            aria-hidden
            className="gc-drift-b pointer-events-none absolute -bottom-48 right-0 h-[36rem] w-[36rem] opacity-45"
            style={{
              background:
                "radial-gradient(closest-side,rgba(255,77,46,0.45),transparent 72%)",
            }}
          />
          <div className="relative mx-auto max-w-[86rem] px-4 sm:px-8">
            <p className="gc-eyebrow text-[var(--coral)]">What you get</p>
            <h2 className="gc-display mt-4 max-w-[16ch] text-[clamp(2rem,5.5vw,4rem)]">
              A story first. A dashboard second.
            </h2>
            <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="min-w-0 border-t border-white/15 pt-5">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: f.tint, color: "#16130f" }}
                  >
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-white/64">
                    {f.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Closing CTA ─────────────────────────────────────── */}
        <section className="mx-auto max-w-[86rem] px-4 py-16 sm:px-8 sm:py-24">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="gc-display max-w-[14ch] text-[clamp(2rem,5.5vw,4rem)]">
              Ready when your repo is.
            </h2>
            <Button asChild size="lg" variant="accent">
              <Link href={demo ? `/repo/${demo.slug}/wrapped` : "/demo"}>
                <Play className="h-4 w-4" />
                Roll the tape
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-[86rem] flex-wrap items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:px-8">
          <p>GitChronicle Wrapped · deterministic Git analysis · MIT License</p>
          <p>No credentials. No AI. Runs on your machine.</p>
        </div>
      </footer>
    </div>
  );
}
