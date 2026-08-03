import { NextResponse } from "next/server";
import {
  getLatestAnalysis,
  getLatestJob,
  getProjectBySlug,
} from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const project = getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const analysis = getLatestAnalysis(project.id);
  const job = getLatestJob(project.id);
  return NextResponse.json({
    project: {
      id: project.id,
      slug: project.slug,
      name: project.name,
      fullName: project.fullName,
      sourceType: project.sourceType,
      sourceUrl: project.sourceUrl,
      status: project.status,
      isDemo: project.isDemo,
      description: project.description,
      errorMessage: project.errorMessage,
    },
    analysis: analysis?.result ?? null,
    job: job
      ? {
          id: job.id,
          status: job.status,
          progress: job.progress,
          stage: job.stage,
          errorMessage: job.errorMessage,
        }
      : null,
  });
}
