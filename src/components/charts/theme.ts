/**
 * Shared Recharts styling bound to the design-system tokens.
 * Axes stay quiet, the ink stays high-contrast, and the tooltip is a dark
 * "receipt" so it never disappears into a light card.
 */
import type { CSSProperties } from "react";

export const chartMargin = { top: 10, right: 14, left: 0, bottom: 0 } as const;

/** Hue-separated series colours, all ≥3:1 on warm paper. */
export const chartSeries = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export const chartAxisTick = {
  fontSize: 11,
  fontWeight: 600,
  fill: "var(--muted-foreground)",
} as const;

export const chartAxisLine = {
  stroke: "var(--border)",
} as const;

/** Tick stubs are noise at this density — the dashed grid carries the read. */
export const chartTickLine = false as const;

export const chartGridProps = {
  stroke: "var(--border)",
  strokeDasharray: "2 5",
  vertical: false,
} as const;

/** Tooltip chrome — explicit foreground so Recharts defaults never fight theme */
export const chartTooltipContentStyle: CSSProperties = {
  background: "var(--popover)",
  border: "none",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
  boxShadow: "0 12px 30px color-mix(in srgb, var(--ink) 26%, transparent)",
  padding: "10px 14px",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "var(--popover-foreground)",
  fontWeight: 800,
  letterSpacing: "-0.01em",
  marginBottom: 6,
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "var(--popover-foreground)",
  fontWeight: 600,
};

export const chartCursorStyle = {
  stroke: "var(--foreground)",
  strokeOpacity: 0.3,
  strokeWidth: 1.5,
  strokeDasharray: "3 3",
} as const;

export const chartLegendWrapperStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--muted-foreground)",
  paddingTop: 10,
};
