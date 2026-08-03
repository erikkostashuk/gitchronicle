"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GrowthPoint } from "@/lib/types/analysis";

export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => String(v).slice(0, 7)}
            minTickGap={28}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="files"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            name="Files"
          />
          <Line
            type="monotone"
            dataKey="commits"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
            name="Commits"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
