import { notFound } from "next/navigation";
import { ActivityChart } from "@/components/charts/activity-chart";
import { CommitHeatmap } from "@/components/charts/heatmap";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Stat } from "@/components/dashboard/stat";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {o.narrative}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Age (days)" value={o.ageDays} />
        <Stat label="Commits" value={o.commitCount} />
        <Stat label="Contributors" value={o.contributorCount} />
        <Stat label="Files" value={o.fileCount} />
        <Stat label="Active days" value={o.activeDays} hint="Days with at least one commit" />
        <Stat label="Tags" value={o.tagCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>Commits over time (last 90 active days shown)</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={r.activity.byDay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Languages</CardTitle>
            <CardDescription>By tracked file extension</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.languages.slice(0, 8).map((l) => (
              <div key={l.language} className="flex items-center gap-2 text-sm">
                <div className="w-24 truncate">{l.language}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(4, l.percent * 100)}%` }}
                  />
                </div>
                <div className="w-10 text-right tabular-nums text-muted-foreground">
                  {l.count}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commit heatmap</CardTitle>
          <CardDescription>Intensity of daily commits across the recent year window</CardDescription>
        </CardHeader>
        <CardContent>
          <CommitHeatmap cells={r.activity.heatmap} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top contributors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.contributors.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">{c.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatNumber(c.commits)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top directories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.directories.slice(0, 6).map((d) => (
              <div key={d.path} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-mono text-xs">{d.path}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatNumber(d.churn)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hot files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.hotspots.slice(0, 6).map((f) => (
              <div key={f.path} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-mono text-xs">
                  {f.path.split("/").pop()}
                </span>
                <Badge variant={f.riskScore >= 50 ? "danger" : "secondary"}>
                  {f.riskScore}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Development eras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.eras.map((era) => (
              <div key={era.id} className="border-l-2 border-primary/40 pl-3">
                <div className="font-medium">{era.name}</div>
                <div className="text-xs text-muted-foreground">
                  {era.start} → {era.end} · {era.commitCount} commits
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{era.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.milestones.slice(0, 10).map((m) => (
              <div key={m.id} className="flex gap-3 text-sm">
                <Badge variant="outline" className="h-fit shrink-0">
                  {m.kind}
                </Badge>
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.date.slice(0, 10)} — {m.description}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
