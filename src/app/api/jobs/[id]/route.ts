import { NextResponse } from "next/server";
import { getJob, getProjectById } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  const project = getProjectById(job.projectId);
  return NextResponse.json({
    id: job.id,
    projectId: job.projectId,
    slug: project?.slug,
    type: job.type,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    finishedAt: job.finishedAt,
  });
}
