import { notFound } from "next/navigation";
import { EmptyState } from "@/components/dashboard/empty-state";
import { WrappedPlayer } from "@/components/wrapped/wrapped-player";
import { getLatestAnalysis, getProjectBySlug } from "@/lib/projects";
import { buildWrappedStory } from "@/lib/wrapped";

export const dynamic = "force-dynamic";

export default async function WrappedPage({
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
        description="Wrapped needs a completed analysis before the story can play."
        actionHref="/"
        actionLabel="Back home"
      />
    );
  }

  const story = buildWrappedStory(analysis.result);

  // Full-bleed player: hide default dashboard chrome spacing by using a portal-like full layout
  return (
    <div className="-mx-4 -my-6 sm:-mx-6 md:fixed md:inset-0 md:z-40 md:m-0">
      <WrappedPlayer story={story} slug={slug} />
    </div>
  );
}
