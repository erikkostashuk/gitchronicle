import { notFound } from "next/navigation";
import { GrowthChart } from "@/components/charts/growth-chart";
import { EmptyState } from "@/components/dashboard/empty-state";
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

/** Matches the overview language field so the two pages read as one system. */
const LANGUAGE_HUES = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export default async function EvolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const analysis = getLatestAnalysis(project.id);
  if (!analysis) {
    return <EmptyState title="Analysis not ready" description="Evolution needs analysis." />;
  }
  const r = analysis.result;

  const longLived = [...r.files]
    .sort(
      (a, b) =>
        new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime()
    )
    .slice(0, 12);

  const recentBirths = [...r.files]
    .sort(
      (a, b) =>
        new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime()
    )
    .slice(0, 12);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="gc-eyebrow text-muted-foreground">Evolution</h2>
        <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed">
          Growth, language mix, structural shifts, bursts, and quiet periods.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repository growth</CardTitle>
          <CardDescription>Cumulative files and commits by month</CardDescription>
        </CardHeader>
        <CardContent>
          <GrowthChart data={r.growth} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Language mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.languages.slice(0, 12).map((l, i) => (
              <div key={l.language} className="flex items-center gap-3 text-sm">
                <div className="w-28 truncate font-semibold">{l.language}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(3, l.percent * 100)}%`,
                      background: LANGUAGE_HUES[i % LANGUAGE_HUES.length],
                    }}
                  />
                </div>
                <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
                  {(l.percent * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Directory footprint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.directories.slice(0, 12).map((d) => (
              <div key={d.path} className="flex justify-between gap-2 text-sm">
                <span className="truncate font-mono text-xs">{d.path}</span>
                <span className="tabular-nums text-muted-foreground">
                  {d.files} files · {formatNumber(d.churn)} churn
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Long-lived modules</CardTitle>
            <CardDescription>Earliest first-seen files still tracked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {longLived.map((f) => (
              <div key={f.path} className="flex justify-between gap-2 text-sm">
                <span className="truncate font-mono text-xs">{f.path}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {f.firstSeen.slice(0, 10)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent file births</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentBirths.map((f) => (
              <div key={f.path} className="flex justify-between gap-2 text-sm">
                <span className="truncate font-mono text-xs">{f.path}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {f.firstSeen.slice(0, 10)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity bursts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.bursts.length === 0 && (
              <p className="text-sm text-muted-foreground">No strong bursts detected.</p>
            )}
            {r.bursts.slice(0, 8).map((b) => (
              <div key={b.start}>
                <div className="text-sm font-medium">
                  {b.start} → {b.end}
                </div>
                <div className="text-xs text-muted-foreground">{b.description}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quiet periods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.quietPeriods.length === 0 && (
              <p className="text-sm text-muted-foreground">No long quiet gaps.</p>
            )}
            {r.quietPeriods.slice(0, 8).map((q) => (
              <div key={q.start}>
                <div className="text-sm font-medium">{q.days} days</div>
                <div className="text-xs text-muted-foreground">
                  {q.start} → {q.end}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Large commits / migrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.largeCommits.slice(0, 8).map((c) => (
              <div key={c.hash}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {c.hash.slice(0, 7)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {c.date.slice(0, 10)}
                  </span>
                </div>
                <div className="mt-0.5 text-sm">{c.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {c.filesChanged} files · +{c.additions}/−{c.deletions}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
