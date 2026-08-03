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
import { listProjects, listProjectsForDisplay } from "@/lib/projects";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const allProjects = listProjects();
  const projects = listProjectsForDisplay(8);
  const demo = allProjects.find((p) => p.isDemo && p.status === "ready");

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 gc-grid-bg opacity-40" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] gc-glow" />

        <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5">
              Open source · Self-hosted · No credentials required
            </Badge>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-primary">
              GitChronicle Wrapped
            </p>
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl md:leading-[1.05]">
              Your repository had a year.{" "}
              <span className="text-primary">Let’s replay it.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              A cinematic, data-true recap of how a codebase became itself —
              commits, people, hotspots, eras, and a shareable story. Then open
              the deep analytics dashboard when you want the details.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-border bg-card p-6 shadow-md">
            <ImportForm />
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
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
              <code className="rounded-full bg-muted px-2 py-0.5 font-mono">
                pnpm analyze -- /path
              </code>
            </p>
          </div>

          {projects.length > 0 && (
            <div className="mx-auto mt-12 max-w-3xl">
              <h2 className="mb-3 text-sm font-bold tracking-tight text-muted-foreground">
                Recent repositories
              </h2>
              <ul
                className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                data-testid="recent-repos"
              >
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={
                        p.status === "ready"
                          ? `/repo/${p.slug}/wrapped`
                          : `/repo/${p.slug}`
                      }
                      className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-muted/70"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold tracking-tight">
                          {p.fullName || p.name}
                        </span>
                        {p.sourceType === "local" && p.localPath && (
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                            {p.localPath}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
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
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="relative border-t border-border bg-card py-16">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
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
                className="rounded-2xl border border-border bg-background p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-bold tracking-tight">{f.title}</h3>
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
