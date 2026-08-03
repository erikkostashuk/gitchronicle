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
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { sort = "risk", q = "" } = await searchParams;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const analysis = getLatestAnalysis(project.id);
  if (!analysis) {
    return <EmptyState title="Analysis not ready" description="Hotspots need completed analysis." />;
  }

  const query = q.trim().toLowerCase();
  const rows = [...analysis.result.hotspots]
    .filter((f) => (query ? f.path.toLowerCase().includes(query) : true))
    .sort((a, b) => {
      if (sort === "churn") return b.churn - a.churn;
      if (sort === "commits") return b.commits - a.commits;
      if (sort === "contributors") return b.contributors - a.contributors;
      if (sort === "recency")
        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      return b.riskScore - a.riskScore;
    });

  const dirs = analysis.result.directories
    .filter((d) => (query ? d.path.toLowerCase().includes(query) : true))
    .slice(0, 15);

  const sortHref = (key: string) => {
    const params = new URLSearchParams();
    params.set("sort", key);
    if (query) params.set("q", q.trim());
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="gc-eyebrow text-muted-foreground">Hotspots</h2>
        <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed">
          Files and directories ranked by churn, change frequency, ownership
          concentration, and recency.
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2" method="get">
        <input type="hidden" name="sort" value={sort} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Filter paths…"
          aria-label="Filter hotspot paths"
          className="gc-mono h-10 w-full max-w-xs rounded-full border border-input bg-card px-4 text-sm sm:w-64"
        />
        <button
          type="submit"
          className="gc-press h-10 rounded-full border-2 border-foreground/80 px-5 text-sm font-bold hover:bg-foreground hover:text-background"
        >
          Search
        </button>
        {query && (
          <a
            href={`?sort=${sort}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </a>
        )}
      </form>

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
            href={sortHref(key)}
            className={
              sort === key
                ? "rounded-full bg-foreground px-4 py-2 font-bold text-background"
                : "rounded-full border px-4 py-2 font-semibold text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
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
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="pb-2.5 pr-3 font-bold">Path</th>
                <th className="pb-2.5 pr-3 font-bold">Risk</th>
                <th className="pb-2.5 pr-3 font-bold">Churn</th>
                <th className="pb-2.5 pr-3 font-bold">Commits</th>
                <th className="pb-2.5 pr-3 font-bold">People</th>
                <th className="pb-2.5 pr-3 font-bold">Bus factor</th>
                <th className="pb-2.5 font-bold">Why</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((f) => (
                <tr key={f.path} className="border-b align-top transition-colors hover:bg-foreground/4">
                  <td className="gc-mono py-3 pr-3 text-[0.8rem] font-semibold">{f.path}</td>
                  <td className="py-3 pr-3">
                    <Badge variant={f.riskScore >= 50 ? "danger" : f.riskScore >= 30 ? "warning" : "secondary"}>
                      {f.riskScore}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 font-semibold tabular-nums">{formatNumber(f.churn)}</td>
                  <td className="py-3 pr-3 font-semibold tabular-nums">{f.commits}</td>
                  <td className="py-3 pr-3 font-semibold tabular-nums">{f.contributors}</td>
                  <td className="py-3 pr-3 font-semibold tabular-nums">{f.busFactor}</td>
                  <td
                    className="max-w-[26rem] truncate py-3 text-xs text-muted-foreground"
                    title={f.riskReasons.join(" · ")}
                  >
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
            <thead className="border-b text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="pb-2.5 pr-3 font-bold">Directory</th>
                <th className="pb-2.5 pr-3 font-bold">Files</th>
                <th className="pb-2.5 pr-3 font-bold">Churn</th>
                <th className="pb-2.5 pr-3 font-bold">Commits</th>
                <th className="pb-2.5 font-bold">Contributors</th>
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
