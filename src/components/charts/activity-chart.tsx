"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivityPoint } from "@/lib/types/analysis";
import {
  chartAxisLine,
  chartAxisTick,
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
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No activity data yet.
      </p>
    );
  }

  return (
    <div className="h-64 w-full" data-testid="activity-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={chartMargin}>
          <defs>
            <linearGradient id="gcCommits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            dataKey="date"
            tick={chartAxisTick}
            axisLine={chartAxisLine}
            tickLine={chartTickLine}
            tickFormatter={(v) => String(v).slice(5)}
            minTickGap={24}
          />
          <YAxis
            tick={chartAxisTick}
            axisLine={chartAxisLine}
            tickLine={chartTickLine}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={chartTooltipContentStyle}
            labelStyle={chartTooltipLabelStyle}
            itemStyle={chartTooltipItemStyle}
            formatter={(value) => [
              typeof value === "number" ? value.toLocaleString() : String(value),
              "Commits",
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Area
            type="monotone"
            dataKey="commits"
            stroke="var(--primary)"
            fill="url(#gcCommits)"
            strokeWidth={2.25}
            isAnimationActive={false}
            name="Commits"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
