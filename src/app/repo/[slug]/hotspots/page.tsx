import { notFound } from "next/navigation";
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

export default async function HotspotsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort = "risk" } = await searchParams;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const analysis = getLatestAnalysis(project.id);
  if (!analysis) {
    return <EmptyState title="Analysis not ready" description="Hotspots need completed analysis." />;
  }

  const rows = [...analysis.result.hotspots].sort((a, b) => {
    if (sort === "churn") return b.churn - a.churn;
    if (sort === "commits") return b.commits - a.commits;
    if (sort === "contributors") return b.contributors - a.contributors;
    if (sort === "recency")
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    return b.riskScore - a.riskScore;
  });

  const dirs = analysis.result.directories.slice(0, 15);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Hotspots</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Files and directories ranked by churn, change frequency, ownership
          concentration, and recency.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["risk", "Risk"],
          ["churn", "Churn"],
          ["commits", "Commits"],
          ["contributors", "Contributors"],
          ["recency", "Recency"],
        ].map(([key, label]) => (
          <a
            key={key}
            href={`?sort=${key}`}
            className={
              sort === key
                ? "rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
                : "rounded-md border border-border px-3 py-1.5 hover:bg-accent"
            }
          >
            {label}
          </a>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risky & important files</CardTitle>
          <CardDescription>
            Risk score blends frequency, churn, recency, and ownership concentration.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-2 pr-3 font-medium">Path</th>
                <th className="pb-2 pr-3 font-medium">Risk</th>
                <th className="pb-2 pr-3 font-medium">Churn</th>
                <th className="pb-2 pr-3 font-medium">Commits</th>
                <th className="pb-2 pr-3 font-medium">People</th>
                <th className="pb-2 pr-3 font-medium">Bus factor</th>
                <th className="pb-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((f) => (
                <tr key={f.path} className="border-b border-border/60 align-top">
                  <td className="py-2.5 pr-3 font-mono text-xs">{f.path}</td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={f.riskScore >= 50 ? "danger" : f.riskScore >= 30 ? "warning" : "secondary"}>
                      {f.riskScore}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{formatNumber(f.churn)}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{f.commits}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{f.contributors}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{f.busFactor}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">
                    {f.riskReasons.join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Directory hotspots</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-2 pr-3 font-medium">Directory</th>
                <th className="pb-2 pr-3 font-medium">Files</th>
                <th className="pb-2 pr-3 font-medium">Churn</th>
                <th className="pb-2 pr-3 font-medium">Commits</th>
                <th className="pb-2 font-medium">Contributors</th>
              </tr>
            </thead>
            <tbody>
              {dirs.map((d) => (
                <tr key={d.path} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-mono text-xs">{d.path}</td>
                  <td className="py-2 pr-3 tabular-nums">{d.files}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatNumber(d.churn)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatNumber(d.commits)}</td>
                  <td className="py-2 tabular-nums">{d.contributors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
