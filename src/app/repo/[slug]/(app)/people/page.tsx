import { notFound } from "next/navigation";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLatestAnalysis, getProjectBySlug } from "@/lib/projects";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const analysis = getLatestAnalysis(project.id);
  if (!analysis) {
    return <EmptyState title="Analysis not ready" description="People view needs analysis." />;
  }

  const people = analysis.result.contributors;
  const nameById = new Map(people.map((p) => [p.id, p.name]));
  const maxCommits = Math.max(1, ...people.map((p) => p.commits));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">People</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Profiles derived from Git history — volume, hours, paths, languages,
          collaboration, and approximate ownership.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity comparison</CardTitle>
          <CardDescription>Commit volume by contributor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {people.slice(0, 12).map((p) => (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <div className="w-36 truncate font-medium sm:w-48">{p.name}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(p.commits / maxCommits) * 100}%` }}
                />
              </div>
              <div className="w-12 text-right tabular-nums text-muted-foreground">
                {p.commits}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {people.slice(0, 12).map((p) => {
          const peakHour = p.hourHistogram.indexOf(Math.max(...p.hourHistogram));
          return (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {p.email || "no email"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {formatPercent(p.ownershipShare, 1)} of commits
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <Mini label="Commits" value={formatNumber(p.commits)} />
                  <Mini label="Active days" value={String(p.activeDays)} />
                  <Mini label="Peak hour (UTC)" value={`${peakHour}:00`} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Active period</div>
                  <div>
                    {p.firstCommit.slice(0, 10)} → {p.lastCommit.slice(0, 10)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Primary paths</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.primaryPaths.slice(0, 4).map((path) => (
                      <Badge key={path.path} variant="outline" className="font-mono text-[10px]">
                        {path.path}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Languages</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.languages.slice(0, 4).map((l) => (
                      <Badge key={l.language} variant="secondary">
                        {l.language}
                      </Badge>
                    ))}
                  </div>
                </div>
                {p.collaborators.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground">Collaborators</div>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {p.collaborators.slice(0, 4).map((c) => (
                        <li key={c.id} className="flex justify-between">
                          <span>{nameById.get(c.id) ?? c.id}</span>
                          <span className="text-muted-foreground">
                            {c.sharedCommits} shared files
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.aliases.length > 1 && (
                  <div className="text-xs text-muted-foreground">
                    Aliases: {p.aliases.join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
