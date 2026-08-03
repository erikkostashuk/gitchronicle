import { notFound } from "next/navigation";
import { EmptyState } from "@/components/dashboard/empty-state";
import { WrappedEntry } from "@/components/wrapped/wrapped-entry";
import { getLatestAnalysis, getProjectBySlug } from "@/lib/projects";
import { buildWrappedStory } from "@/lib/wrapped";

export const dynamic = "force-dynamic";

/**
 * Full-screen Wrapped experience — outside the dashboard (app) layout
 * so chrome/sidebar cannot intercept pointer events or constrain height.
 */
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
      <div className="min-h-screen p-6">
        <EmptyState
          title="Analysis not ready"
          description="Wrapped needs a completed analysis before the story can play."
          actionHref="/"
          actionLabel="Back home"
        />
      </div>
    );
  }

  const story = buildWrappedStory(analysis.result);
  const storyJson = JSON.stringify(story);

  return (
    <div className="fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-black">
      <WrappedEntry storyJson={storyJson} slug={slug} />
    </div>
  );
}
