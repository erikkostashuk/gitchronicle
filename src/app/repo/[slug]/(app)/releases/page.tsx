import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLatestAnalysis, getProjectBySlug } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function ReleasesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const analysis = getLatestAnalysis(project.id);
  if (!analysis) {
    return <EmptyState title="Analysis not ready" description="Releases need analysis." />;
  }
  const releases = analysis.result.releases;
  const categories = analysis.result.categories;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Releases</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tags and inferred release ranges with categorized change summaries.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/repos/${slug}/export?type=report`}>
            <Download className="h-4 w-4" />
            Full report
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change categories (all history)</CardTitle>
          <CardDescription>
            Conventional commits and keyword heuristics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Badge key={c.category} variant="secondary">
              {c.category}: {c.count}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {releases.length === 0 ? (
        <EmptyState
          title="No tags found"
          description="This repository has no Git tags, so release ranges could not be inferred."
        />
      ) : (
        <div className="space-y-4">
          {releases.map((rel) => (
            <Card key={rel.tag}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {rel.tag}
                  </CardTitle>
                  <CardDescription>
                    {rel.date.slice(0, 10)}
                    {rel.previousTag ? ` · since ${rel.previousTag}` : " · first tagged release"}
                    {" · "}
                    {rel.commits} commits · {rel.contributors.length} contributors
                  </CardDescription>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`/api/repos/${slug}/export?type=release&tag=${encodeURIComponent(rel.tag)}`}
                  >
                    <Download className="h-4 w-4" />
                    Notes
                  </a>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {rel.categories.map((c) => (
                    <Badge key={c.category} variant="outline">
                      {c.category} {c.count}
                    </Badge>
                  ))}
                </div>
                {rel.highlights.length > 0 && (
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {rel.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
