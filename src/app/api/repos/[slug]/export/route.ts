import { NextResponse } from "next/server";
import {
  generateReleaseNotes,
  generateRepositoryReport,
} from "@/lib/exports/markdown";
import { getLatestAnalysis, getProjectBySlug } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const project = getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const analysis = getLatestAnalysis(project.id);
  if (!analysis) {
    return NextResponse.json({ error: "No analysis" }, { status: 404 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "report";
  const tag = url.searchParams.get("tag");

  let markdown = "";
  let filename = `${slug}-report.md`;

  if (type === "release") {
    const release = tag
      ? analysis.result.releases.find((r) => r.tag === tag)
      : analysis.result.releases[0];
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }
    markdown = generateReleaseNotes(release, project.name);
    filename = `${slug}-${release.tag}-notes.md`;
  } else {
    markdown = generateRepositoryReport(analysis.result);
  }

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
