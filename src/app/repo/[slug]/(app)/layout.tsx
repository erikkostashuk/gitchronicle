import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { DashboardNav } from "@/components/dashboard/nav";
import { CommandPalette } from "@/components/command-palette";
import { RepoSwitcher } from "@/components/repo-switcher";
import { Badge } from "@/components/ui/badge";
import {
  getLatestAnalysis,
  getLatestJob,
  getProjectBySlug,
  listProjects,
} from "@/lib/projects";
import { JobStatusPanel } from "@/components/dashboard/job-status";

export const dynamic = "force-dynamic";

export default async function RepoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const projects = listProjects();
  const analysis = getLatestAnalysis(project.id);
  const job = getLatestJob(project.id);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader
        right={
          <RepoSwitcher
            currentSlug={slug}
            projects={projects.map((p) => ({
              slug: p.slug,
              name: p.name,
              status: p.status,
              isDemo: p.isDemo,
            }))}
          />
        }
      />
      <CommandPalette
        slug={slug}
        projects={projects.map((p) => ({ slug: p.slug, name: p.name }))}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <div className="mb-4 md:mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">
                {project.fullName || project.name}
              </h1>
              {project.isDemo && <Badge variant="secondary">Demo</Badge>}
            </div>
            {project.sourceUrl && (
              <Link
                href={project.sourceUrl}
                className="mt-1 block truncate text-xs text-muted-foreground hover:text-primary"
                target="_blank"
                rel="noreferrer"
              >
                {project.sourceUrl}
              </Link>
            )}
            {analysis && (
              <p className="mt-2 text-xs text-muted-foreground">
                {analysis.result.overview.commitCount} commits ·{" "}
                {analysis.result.overview.contributorCount} contributors
              </p>
            )}
          </div>
          <DashboardNav slug={slug} />
        </aside>

        <div className="min-w-0 flex-1">
          {project.status !== "ready" && (
            <JobStatusPanel
              jobId={job?.id}
              initialProgress={job?.progress ?? 0}
              initialStage={job?.stage ?? project.status}
              initialStatus={job?.status ?? project.status}
              errorMessage={project.errorMessage}
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
