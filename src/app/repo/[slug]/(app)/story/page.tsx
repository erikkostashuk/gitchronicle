import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Sparkles } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="gc-eyebrow text-muted-foreground">Story</h2>
          <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed">
            Classic chronological slides. Prefer{" "}
            <Link href={`/repo/${slug}/wrapped`} className="font-semibold underline decoration-[var(--coral)] decoration-2 underline-offset-4">
              Wrapped
            </Link>{" "}
            for the full cinematic recap.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/repo/${slug}/wrapped`}>
              <Sparkles className="h-4 w-4" />
              Open Wrapped
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/repos/${slug}/export?type=report`}>
              <Download className="h-4 w-4" />
              Export Markdown report
            </a>
          </Button>
        </div>
      </div>
      <StoryDeck slides={analysis.result.story} />
    </div>
  );
}
