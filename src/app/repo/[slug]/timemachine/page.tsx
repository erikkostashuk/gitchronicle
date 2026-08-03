import { notFound } from "next/navigation";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TimeMachinePlayer } from "@/components/dashboard/time-machine";
import { getLatestAnalysis, getProjectBySlug } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function TimeMachinePage({
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
        description="Time Machine needs a completed analysis."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Time Machine</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Play, pause, scrub, and step through sampled repository history.
          Large repositories use cached timeline samples.
        </p>
      </div>
      <TimeMachinePlayer
        samples={analysis.result.timeline}
        contributors={analysis.result.contributors.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
      />
    </div>
  );
}
