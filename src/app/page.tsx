import Link from "next/link";
import {
  Clock,
  FileWarning,
  GitBranch,
  Network,
  Sparkles,
  Users,
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] gc-glow" />

        <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Open source · Self-hosted · No credentials required
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Watch a codebase{" "}
              <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                become itself
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              GitChronicle turns a Git repository into an interactive visual
              documentary and engineering-intelligence dashboard — eras,
              hotspots, people, graphs, releases, and a Time Machine.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-border bg-card/90 p-5 shadow-lg backdrop-blur">
            <ImportForm />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={demo ? `/repo/${demo.slug}` : "/demo"}>
                  <Sparkles className="h-4 w-4" />
                  Open bundled demo
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                or run <code className="rounded bg-muted px-1.5 py-0.5 font-mono">pnpm analyze -- /path</code>
              </span>
            </div>
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
                      href={`/repo/${p.slug}`}
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
                icon: Clock,
                title: "Time Machine",
                body: "Play, scrub, and step through history with a living tree and activity at every sample.",
              },
              {
                icon: FileWarning,
                title: "Hotspots",
                body: "Rank files by churn, ownership concentration, and recency — with plain-language risk reasons.",
              },
              {
                icon: Users,
                title: "People",
                body: "Contributor profiles, preferred hours, primary paths, collaboration, and bus-factor signals.",
              },
              {
                icon: GitBranch,
                title: "Evolution",
                body: "Growth curves, language mix, rewrites, bursts, and quiet periods inferred from real Git data.",
              },
              {
                icon: Network,
                title: "Graphs",
                body: "Co-change and collaboration graphs with pan, zoom, and caps so large repos stay responsive.",
              },
              {
                icon: Sparkles,
                title: "Story & releases",
                body: "Presentation-style narrative and downloadable Markdown release notes and reports.",
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
        GitChronicle · deterministic Git analysis · MIT License
      </footer>
    </div>
  );
}
