import { NextResponse } from "next/server";
import { enqueueRetry } from "@/lib/jobs/retry";
import { getProjectBySlug } from "@/lib/projects";

export const dynamic = "force-dynamic";

/**
 * POST /api/repos/[slug]/retry
 * Re-queue analysis for a failed (or ready) non-demo project.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const project = getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const result = enqueueRetry(project);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    projectId: project.id,
    slug: project.slug,
    jobId: result.jobId,
    type: result.type,
    status: "pending",
  });
}
