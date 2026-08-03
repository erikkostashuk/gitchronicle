/**
 * Shared Recharts styling bound to CSS theme tokens.
 * Keeps light-theme axis labels / tooltips readable on near-white cards.
 */
import type { CSSProperties } from "react";

export const chartMargin = { top: 8, right: 12, left: 0, bottom: 0 } as const;

export const chartAxisTick = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
} as const;

export const chartAxisLine = {
  stroke: "var(--border)",
} as const;

export const chartTickLine = {
  stroke: "var(--border)",
} as const;

export const chartGridProps = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

/** Tooltip chrome — explicit foreground so Recharts default black/white never fights theme */
export const chartTooltipContentStyle: CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
  boxShadow:
    "0 8px 24px color-mix(in oklab, var(--foreground) 12%, transparent)",
  padding: "8px 12px",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "var(--popover-foreground)",
  fontWeight: 600,
  marginBottom: 4,
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "var(--popover-foreground)",
};

export const chartLegendWrapperStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--muted-foreground)",
  paddingTop: 4,
};
