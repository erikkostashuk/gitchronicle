import Link from "next/link";
import {
  Clock,
  FileWarning,
  Sparkles,
  Users,
  Network,
  Play,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ImportForm } from "@/components/import-form";
import { Button } from "@/components/ui/button";
import { listProjects } from "@/lib/projects";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const projects = listProjects();
  const demo = projects.find((p) => p.isDemo && p.status === "ready");

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 gc-grid-bg opacity-70" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] gc-glow" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-500/5 via-transparent to-indigo-500/5" />

        <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Open source · Self-hosted · No credentials required
            </Badge>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              GitChronicle Wrapped
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Your repository had a year.{" "}
              <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">
                Let’s replay it.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              A cinematic, data-true recap of how a codebase became itself —
              commits, people, hotspots, eras, and a shareable story. Then open
              the deep analytics dashboard when you want the details.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-border bg-card/90 p-5 shadow-lg backdrop-blur">
            <ImportForm />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button asChild size="sm">
                <Link href={demo ? `/repo/${demo.slug}/wrapped` : "/demo"}>
                  <Play className="h-4 w-4" />
                  Play bundled Wrapped
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={demo ? `/repo/${demo.slug}` : "/demo"}>
                  <Sparkles className="h-4 w-4" />
                  Open analytics demo
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Local repos:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                pnpm analyze -- /path
              </code>
            </p>
          </div>

          {projects.length > 0 && (
            <div className="mx-auto mt-12 max-w-3xl">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Recent repositories
              </h2>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {projects.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={
                        p.status === "ready"
                          ? `/repo/${p.slug}/wrapped`
                          : `/repo/${p.slug}`
                      }
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/50"
                    >
                      <span className="font-medium">{p.fullName || p.name}</span>
                      <span className="flex items-center gap-2">
                        {p.isDemo && <Badge variant="secondary">Demo</Badge>}
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
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="relative border-t border-border bg-card/40 py-16">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {[
              {
                icon: Play,
                title: "Wrapped story",
                body: "Fifteen-plus adaptive full-screen scenes: personality, streaks, people, plot twists — generated from real Git metrics.",
              },
              {
                icon: Users,
                title: "People & ownership",
                body: "Contributor profiles, collaboration, bus-factor signals, and a playful main-character scene.",
              },
              {
                icon: FileWarning,
                title: "Hotspots",
                body: "Churn, recency, and ownership concentration with plain-language risk reasons.",
              },
              {
                icon: Clock,
                title: "Time Machine",
                body: "Scrub sampled history with a living tree after you finish the recap.",
              },
              {
                icon: Network,
                title: "Graphs",
                body: "Co-change constellations and collaboration maps — capped so large repos stay fluid.",
              },
              {
                icon: Sparkles,
                title: "Share cards",
                body: "Download social PNGs for recap, personality, streaks, and more — no AI, no login.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-background p-5 shadow-sm"
              >
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        GitChronicle Wrapped · deterministic Git analysis · MIT License
      </footer>
    </div>
  );
}
