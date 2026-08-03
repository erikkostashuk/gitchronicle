"use client";

import { cn } from "@/lib/utils";
import type { HeatmapCell } from "@/lib/types/analysis";
import { Tooltip, TooltipProvider } from "../ui/tooltip";

export function CommitHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const byDate = new Map(cells.map((c) => [c.date, c.count]));
  if (cells.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity data.</p>
    );
  }

  const end = new Date(cells[cells.length - 1]!.date);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 52 * 7);

  const days: { date: string; count: number }[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: byDate.get(key) ?? 0 });
  }

  const max = Math.max(1, ...days.map((d) => d.count));
  const weeks: typeof days[] = [];
  // pad to Sunday start
  const first = new Date(days[0]!.date);
  const pad = first.getUTCDay();
  const padded = [
    ...Array.from({ length: pad }, () => ({ date: "", count: -1 })),
    ...days,
  ];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  function level(count: number) {
    if (count <= 0) return 0;
    const r = count / max;
    if (r < 0.25) return 1;
    if (r < 0.5) return 2;
    if (r < 0.75) return 3;
    return 4;
  }

  // Empty cells use a visible light-theme tile (not pure white-on-white)
  const colors = [
    "bg-muted ring-1 ring-inset ring-border/80",
    "bg-primary/25",
    "bg-primary/45",
    "bg-primary/70",
    "bg-primary",
  ];

  return (
    <TooltipProvider>
      <div className="overflow-x-auto" data-testid="commit-heatmap">
        <div className="inline-flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => {
                if (day.count < 0 || !day.date) {
                  return <div key={di} className="h-3 w-3" />;
                }
                const lv = level(day.count);
                return (
                  <Tooltip
                    key={day.date}
                    content={`${day.date}: ${day.count} commit${day.count === 1 ? "" : "s"}`}
                  >
                    <div
                      className={cn("h-3 w-3 rounded-[3px]", colors[lv])}
                      aria-label={`${day.date}: ${day.count} commits`}
                    />
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {colors.map((c, i) => (
              <div key={i} className={cn("h-2.5 w-2.5 rounded-[2px]", c)} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
