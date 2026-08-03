import { notFound } from "next/navigation";
import { EmptyState } from "@/components/dashboard/empty-state";
import { GraphsView } from "@/components/dashboard/graphs-view";
import { getLatestAnalysis, getProjectBySlug } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function GraphsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const analysis = getLatestAnalysis(project.id);
  if (!analysis) {
    return <EmptyState title="Analysis not ready" description="Graphs need analysis." />;
  }
  const r = analysis.result;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Graphs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive co-change and collaboration graphs. Data is capped and
          aggregated during analysis so the UI stays responsive.
        </p>
      </div>
      <GraphsView
        coChange={r.coChange}
        collaboration={r.collaboration}
        contributors={r.contributors}
      />
    </div>
  );
}
