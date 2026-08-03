"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GrowthPoint } from "@/lib/types/analysis";
import {
  chartAxisLine,
  chartAxisTick,
  chartGridProps,
  chartLegendWrapperStyle,
  chartMargin,
  chartTickLine,
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from "./theme";

export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No growth series yet.
      </p>
    );
  }

  return (
    <div className="h-64 w-full" data-testid="growth-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ ...chartMargin, top: 4, bottom: 4 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            dataKey="date"
            tick={chartAxisTick}
            axisLine={chartAxisLine}
            tickLine={chartTickLine}
            tickFormatter={(v) => String(v).slice(0, 7)}
            minTickGap={28}
          />
          <YAxis
            tick={chartAxisTick}
            axisLine={chartAxisLine}
            tickLine={chartTickLine}
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={chartTooltipContentStyle}
            labelStyle={chartTooltipLabelStyle}
            itemStyle={chartTooltipItemStyle}
            formatter={(value, name) => [
              typeof value === "number" ? value.toLocaleString() : String(value),
              String(name),
            ]}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={chartLegendWrapperStyle}
          />
          <Line
            type="monotone"
            dataKey="files"
            stroke="var(--chart-1)"
            strokeWidth={2.25}
            dot={false}
            name="Files"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="commits"
            stroke="var(--chart-2)"
            strokeWidth={2.25}
            dot={false}
            name="Commits"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
