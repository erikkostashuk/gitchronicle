"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivityPoint } from "@/lib/types/analysis";
import {
  chartAxisLine,
  chartAxisTick,
  chartCursorStyle,
  chartGridProps,
  chartMargin,
  chartTickLine,
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from "./theme";

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const series = data.slice(-90);
  if (series.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-center">
        <p className="text-sm font-bold">No activity data yet.</p>
        <p className="text-xs text-muted-foreground">
          Commits will appear here once analysis finds dated history.
        </p>
      </div>
    );
  }

  const peak = series.reduce((best, p) => (p.commits > best.commits ? p : best));

  return (
    <div className="h-64 w-full" data-testid="activity-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={chartMargin}>
          <defs>
            <linearGradient id="gcCommits" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-1)"
                stopOpacity={0.36}
              />
              <stop
                offset="100%"
                stopColor="var(--chart-1)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            dataKey="date"
            tick={chartAxisTick}
            axisLine={chartAxisLine}
            tickLine={chartTickLine}
            tickFormatter={(v) => String(v).slice(5)}
            minTickGap={28}
            dy={4}
          />
          <YAxis
            tick={chartAxisTick}
            axisLine={false}
            tickLine={chartTickLine}
            width={34}
            allowDecimals={false}
          />
          <Tooltip
            cursor={chartCursorStyle}
            contentStyle={chartTooltipContentStyle}
            labelStyle={chartTooltipLabelStyle}
            itemStyle={chartTooltipItemStyle}
            formatter={(value) => [
              typeof value === "number"
                ? value.toLocaleString("en-US")
                : String(value),
              "Commits",
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Area
            type="monotone"
            dataKey="commits"
            stroke="var(--chart-1)"
            fill="url(#gcCommits)"
            strokeWidth={2.5}
            activeDot={{
              r: 5,
              fill: "var(--chart-1)",
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
            name="Commits"
          />
          {peak.commits > 0 && (
            <ReferenceDot
              x={peak.date}
              y={peak.commits}
              r={4}
              fill="var(--chart-1)"
              stroke="var(--card)"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
