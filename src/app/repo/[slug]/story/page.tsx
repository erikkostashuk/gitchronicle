import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StoryDeck } from "@/components/dashboard/story-deck";
import { Button } from "@/components/ui/button";
import { getLatestAnalysis, getProjectBySlug } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const analysis = getLatestAnalysis(project.id);
  if (!analysis) {
    return <EmptyState title="Analysis not ready" description="Story needs analysis." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Story</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A presentation-style chronological narrative. Use arrow keys or
            buttons; enter fullscreen for demos.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/repos/${slug}/export?type=report`}>
            <Download className="h-4 w-4" />
            Export Markdown report
          </a>
        </Button>
      </div>
      <StoryDeck slides={analysis.result.story} />
    </div>
  );
}
