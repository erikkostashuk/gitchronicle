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
  chartCursorStyle,
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
      <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-center">
        <p className="text-sm font-bold">No growth series yet.</p>
        <p className="text-xs text-muted-foreground">
          File and commit growth appears once history is sampled.
        </p>
      </div>
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
            axisLine={false}
            tickLine={chartTickLine}
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            cursor={chartCursorStyle}
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
