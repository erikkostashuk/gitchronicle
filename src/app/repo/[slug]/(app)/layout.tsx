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
  listProjectsForDisplay,
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

  // Dedupe accidental re-analyzes so the switcher stays scannable
  const projects = listProjectsForDisplay(40);
  // Ensure current project is always listed even if filtered out by limit
  if (!projects.some((p) => p.slug === slug)) {
    projects.unshift(project);
  }
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
              name: p.fullName || p.name,
              status: p.status,
              isDemo: p.isDemo,
            }))}
          />
        }
      />
      <CommandPalette
        slug={slug}
        projects={projects.map((p) => ({
          slug: p.slug,
          name: p.fullName || p.name,
        }))}
      />

      {/* Repository masthead */}
      <div className="border-b bg-muted/35">
        <div className="mx-auto flex w-full max-w-[86rem] flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 py-6 sm:px-8 sm:py-8">
          <div className="min-w-0">
            <p className="gc-eyebrow text-muted-foreground">Repository</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <h1 className="gc-display max-w-full break-words text-[clamp(1.6rem,4vw,2.75rem)]">
                {project.fullName || project.name}
              </h1>
              {project.isDemo && <Badge variant="secondary">Demo</Badge>}
            </div>
            {project.sourceUrl && (
              <Link
                href={project.sourceUrl}
                className="gc-mono mt-2 block max-w-full truncate text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {project.sourceUrl}
              </Link>
            )}
          </div>
          {analysis && (
            <dl className="flex shrink-0 gap-6 sm:gap-9">
              {[
                {
                  k: "Commits",
                  v: analysis.result.overview.commitCount,
                },
                {
                  k: "Contributors",
                  v: analysis.result.overview.contributorCount,
                },
                { k: "Files", v: analysis.result.overview.fileCount },
              ].map((s) => (
                <div key={s.k}>
                  <dd className="text-xl font-extrabold tabular-nums tracking-tight sm:text-2xl">
                    {s.v.toLocaleString("en-US")}
                  </dd>
                  <dt className="gc-eyebrow mt-1 text-[0.55rem] text-muted-foreground">
                    {s.k}
                  </dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[86rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-8 md:flex-row md:gap-10">
        <aside className="md:sticky md:top-20 md:h-fit md:w-48 md:shrink-0">
          <DashboardNav slug={slug} />
        </aside>

        <div className="min-w-0 flex-1">
          {project.status !== "ready" && (
            <JobStatusPanel
              key={`${job?.id ?? "none"}-${project.status}`}
              slug={slug}
              jobId={job?.id}
              initialProgress={job?.progress ?? 0}
              initialStage={job?.stage ?? project.status}
              initialStatus={
                // Prefer job status when present; project "failed" maps to failed UI
                job?.status ??
                (project.status === "failed" ? "failed" : project.status)
              }
              errorMessage={project.errorMessage ?? job?.errorMessage}
              canRetry={
                !project.isDemo &&
                project.sourceType !== "demo" &&
                (project.sourceType === "github"
                  ? !!project.sourceUrl
                  : !!project.localPath)
              }
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
