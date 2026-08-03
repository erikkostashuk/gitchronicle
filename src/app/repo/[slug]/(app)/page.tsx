import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { ActivityChart } from "@/components/charts/activity-chart";
import { CommitHeatmap } from "@/components/charts/heatmap";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Section } from "@/components/dashboard/section";
import { LanguageBars } from "@/components/dashboard/language-bars";
import { Stat } from "@/components/dashboard/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLatestAnalysis, getProjectBySlug } from "@/lib/projects";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const analysis = getLatestAnalysis(project.id);
  if (!analysis) {
    return (
      <EmptyState
        title="Analysis not ready"
        description="This repository is still being analyzed or failed. Check the status above."
        actionHref="/"
        actionLabel="Back home"
      />
    );
  }

  const r = analysis.result;
  const o = r.overview;
  const maxContributor = Math.max(1, ...r.contributors.map((c) => c.commits));
  const maxDir = Math.max(1, ...r.directories.map((d) => d.churn));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="gc-eyebrow text-muted-foreground">Overview</h2>
          <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed">
            {o.narrative}
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href={`/repo/${slug}/wrapped`}>
            <Sparkles className="h-4 w-4" />
            Play Wrapped
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Age (days)" value={o.ageDays} index={0} />
        <Stat label="Commits" value={o.commitCount} index={1} />
        <Stat label="Contributors" value={o.contributorCount} index={2} />
        <Stat label="Files" value={o.fileCount} index={3} />
        <Stat
          label="Active days"
          value={o.activeDays}
          hint="Days with at least one commit"
          index={4}
        />
        <Stat label="Tags" value={o.tagCount} index={5} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Section
          title="Activity"
          description="Commits over time — last 90 active days"
        >
          <ActivityChart data={r.activity.byDay} />
        </Section>
        <Section title="Languages" description="By tracked file extension">
          <LanguageBars languages={r.languages.slice(0, 6)} />
        </Section>
      </div>

      <Section
        title="Commit heatmap"
        description="Intensity of daily commits across the recent year window"
      >
        <CommitHeatmap cells={r.activity.heatmap} />
      </Section>

      <div className="grid gap-6 md:grid-cols-3">
        <Section title="Top contributors">
          <ol className="space-y-2.5">
            {r.contributors.slice(0, 6).map((c, i) => (
              <li key={c.id} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-bold tracking-tight">
                    {c.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatNumber(c.commits)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, (c.commits / maxContributor) * 100)}%`,
                      background: "var(--chart-2)",
                      opacity: i === 0 ? 1 : 0.4,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Top directories">
          <ol className="space-y-2.5">
            {r.directories.slice(0, 6).map((d, i) => (
              <li key={d.path} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="gc-mono truncate text-xs font-semibold">
                    {d.path}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {formatNumber(d.churn)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, (d.churn / maxDir) * 100)}%`,
                      background: "var(--chart-3)",
                      opacity: i === 0 ? 1 : 0.45,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Hot files" description="Highest risk score">
          <ul className="divide-y">
            {r.hotspots.slice(0, 6).map((f) => (
              <li
                key={f.path}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span
                  className="gc-mono truncate text-xs font-semibold"
                  title={f.path}
                >
                  {f.path.split("/").pop()}
                </span>
                <Badge variant={f.riskScore >= 50 ? "danger" : "secondary"}>
                  {f.riskScore}
                </Badge>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Development eras">
          <ol className="relative space-y-5">
            {r.eras.map((era, i) => (
              <li key={era.id} className="relative pl-5">
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full"
                  style={{
                    background: i === 0 ? "var(--chart-1)" : "var(--border)",
                    outline:
                      i === 0 ? "3px solid color-mix(in srgb,var(--chart-1) 22%,transparent)" : undefined,
                  }}
                />
                {i < r.eras.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[5px] top-5 h-[calc(100%+0.5rem)] w-px bg-border"
                  />
                )}
                <div className="font-bold tracking-tight">{era.name}</div>
                <div className="gc-mono mt-0.5 text-[11px] text-muted-foreground">
                  {era.start} → {era.end} · {era.commitCount} commits
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {era.summary}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Milestones">
          <ul className="divide-y">
            {r.milestones.slice(0, 10).map((m) => (
              <li key={m.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <Badge variant="outline" className="h-fit shrink-0">
                  {m.kind}
                </Badge>
                <div className="min-w-0">
                  <div className="text-sm font-bold tracking-tight">
                    {m.title}
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    <span className="gc-mono">{m.date.slice(0, 10)}</span> —{" "}
                    {m.description}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
