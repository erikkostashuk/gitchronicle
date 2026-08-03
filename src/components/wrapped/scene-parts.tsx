"use client";

/**
 * Typographic atoms and data visuals shared by the Wrapped scene layouts.
 * Everything animates with transform / opacity / clip-path only, and every
 * animated class is neutralised by the global reduced-motion rules.
 */
import { useEffect, useState } from "react";
import type { WrappedScene } from "@/lib/wrapped";
import type { SceneTheme } from "./scene-theme";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("en-US");

export function fmt(n: number): string {
  return nf.format(n);
}

/* ─────────────────────────── typography ─────────────────────────── */

export function Eyebrow({
  children,
  theme,
  className,
}: {
  children: React.ReactNode;
  theme: SceneTheme;
  className?: string;
}) {
  return (
    <p
      className={cn("gc-eyebrow", className)}
      style={{ color: theme.mode === "dark" ? theme.accent : theme.inkSoft }}
    >
      {children}
    </p>
  );
}

export function Title({
  children,
  className,
  size = "lg",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  style?: React.CSSProperties;
}) {
  const scale = {
    sm: "text-[clamp(1.5rem,3.4vw,2.4rem)]",
    md: "text-[clamp(1.9rem,4.6vw,3.4rem)]",
    lg: "text-[clamp(2.2rem,6vw,4.6rem)]",
    xl: "text-[clamp(2.6rem,8.5vw,7rem)]",
  }[size];
  return (
    <h2 className={cn("gc-display", scale, className)} style={style}>
      {children}
    </h2>
  );
}

export function Lede({
  children,
  theme,
  className,
}: {
  children: React.ReactNode;
  theme: SceneTheme;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "max-w-[46ch] text-[clamp(0.95rem,1.6vw,1.2rem)] leading-snug",
        className
      )}
      style={{ color: theme.inkSoft }}
    >
      {children}
    </p>
  );
}

/* ─────────────────────────── animated number ─────────────────────────── */

export function CountUp({
  value,
  reduceMotion,
  className,
  style,
}: {
  value: string | number;
  reduceMotion: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const isNum = typeof value === "number" && Number.isFinite(value);
  // Keyed by the target so a scene change never shows a stale tween frame,
  // and so the server-rendered markup already holds the final number.
  const [anim, setAnim] = useState<{ target: number; frame: number } | null>(
    null
  );

  useEffect(() => {
    if (!isNum || reduceMotion) return;
    const target = value as number;
    let raf = 0;
    const start = performance.now();
    const duration = Math.min(1100, 420 + Math.log10(Math.max(1, target)) * 220);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setAnim({ target, frame: Math.round(target * eased) });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, isNum, reduceMotion]);

  const live = isNum && anim?.target === value ? anim.frame : null;
  const text = isNum ? fmt(live ?? (value as number)) : String(value);
  return (
    <span className={className} style={style}>
      {text}
    </span>
  );
}

/* ─────────────────────────── stat rail ─────────────────────────── */

/** Ruled stat row — deliberately not a card grid. */
export function StatRail({
  metrics,
  theme,
  className,
  columns,
}: {
  metrics: NonNullable<WrappedScene["metrics"]>;
  theme: SceneTheme;
  className?: string;
  columns?: string;
}) {
  if (metrics.length === 0) return null;
  return (
    <dl
      className={cn(
        "gc-stagger grid gap-x-6 gap-y-4",
        columns ?? "grid-cols-2 sm:grid-cols-3",
        className
      )}
    >
      {metrics.map((m) => (
        <div
          key={m.label}
          className="min-w-0 border-t pt-2"
          style={{ borderColor: theme.rule }}
        >
          <dt
            className="gc-eyebrow text-[0.58rem] leading-tight"
            style={{ color: theme.inkSoft }}
          >
            {m.label}
          </dt>
          <dd
            className="mt-1 truncate text-[clamp(1rem,2vw,1.5rem)] font-bold tabular-nums tracking-tight"
            style={{ color: theme.ink }}
            title={String(m.value)}
          >
            {typeof m.value === "number" ? fmt(m.value) : m.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Chips({
  chips,
  theme,
  className,
}: {
  chips: string[];
  theme: SceneTheme;
  className?: string;
}) {
  if (chips.length === 0) return null;
  return (
    <ul className={cn("gc-stagger flex flex-wrap gap-2", className)}>
      {chips.map((c) => (
        <li
          key={c}
          className="rounded-full px-3 py-1 text-[0.72rem] font-semibold sm:text-xs"
          style={{
            background: theme.inset,
            color: theme.ink,
            border: `1px solid ${theme.rule}`,
          }}
        >
          {c}
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────── visuals ─────────────────────────── */

/** Animated column chart — months, day windows. Highlight column gets the accent. */
export function ColumnChart({
  series,
  theme,
  reduceMotion,
  height = "h-40 sm:h-56",
  showLabels = true,
}: {
  series: NonNullable<WrappedScene["series"]>;
  theme: SceneTheme;
  reduceMotion: boolean;
  height?: string;
  showLabels?: boolean;
}) {
  if (series.length === 0) return null;
  const max = Math.max(1, ...series.map((s) => s.value));
  const step = Math.max(1, Math.ceil(series.length / 6));
  return (
    <figure className="min-w-0">
      <div
        className={cn("flex items-end gap-[3px] border-b sm:gap-1.5", height)}
        style={{ borderColor: theme.rule }}
        role="img"
        aria-label={`Column chart of ${series.length} periods, peak ${max}`}
      >
        {series.map((s, i) => {
          const pct = Math.max(3, (s.value / max) * 100);
          return (
            <div
              key={`${s.label}-${i}`}
              className="group relative flex min-w-0 flex-1 items-end"
              style={{ height: "100%" }}
            >
              <div
                className={cn(
                  "w-full rounded-t-[3px] transition-[filter] duration-200 group-hover:brightness-110",
                  !reduceMotion && "gc-col-grow"
                )}
                style={{
                  height: `${pct}%`,
                  background: s.highlight ? theme.accent : theme.inset,
                  outline: s.highlight ? `1px solid ${theme.accent}` : undefined,
                  animationDelay: reduceMotion
                    ? undefined
                    : `${0.12 + i * 0.022}s`,
                }}
              />
              {s.highlight && (
                <span
                  className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                  style={{ background: theme.accent, color: theme.onAccent }}
                >
                  {s.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {showLabels && (
        <figcaption
          className="mt-2 flex justify-between gap-2 text-[10px] font-medium tabular-nums sm:text-[11px]"
          style={{ color: theme.inkSoft }}
        >
          {series
            .filter((_, i) => i % step === 0 || i === series.length - 1)
            .map((s, i) => (
              <span key={`${s.label}-${i}`} className="truncate">
                {s.label.length > 7 ? s.label.slice(5) : s.label}
              </span>
            ))}
        </figcaption>
      )}
    </figure>
  );
}

/** Ranked rows — big names, proportional accent bars, no duplicate list. */
export function RankRows({
  bars,
  theme,
  reduceMotion,
  suffix,
}: {
  bars: NonNullable<WrappedScene["bars"]>;
  theme: SceneTheme;
  reduceMotion: boolean;
  suffix?: string;
}) {
  if (bars.length === 0) return null;
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <ol className="min-w-0 space-y-1.5">
      {bars.map((b, i) => (
        <li
          key={`${b.label}-${i}`}
          className={cn(
            "group relative isolate overflow-hidden rounded-lg",
            !reduceMotion && "gc-in-left"
          )}
          style={{
            animationDelay: reduceMotion ? undefined : `${0.15 + i * 0.07}s`,
          }}
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-0 left-0 -z-10 rounded-lg opacity-90 transition-[filter] duration-200 group-hover:brightness-110",
              !reduceMotion && "gc-bar-grow"
            )}
            style={{
              width: `${Math.max(8, (b.value / max) * 100)}%`,
              background:
                i === 0
                  ? theme.accent
                  : `color-mix(in srgb, ${theme.accent} ${Math.max(12, 40 - i * 8)}%, transparent)`,
              animationDelay: reduceMotion ? undefined : `${0.2 + i * 0.07}s`,
            }}
          />
          <div className="flex items-baseline justify-between gap-3 px-3 py-2">
            <span className="flex min-w-0 items-baseline gap-2.5">
              <span
                className="shrink-0 text-[0.7rem] font-bold tabular-nums opacity-55"
                style={{ color: i === 0 ? theme.onAccent : theme.ink }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="truncate text-[clamp(0.95rem,2.1vw,1.35rem)] font-bold tracking-tight"
                style={{ color: i === 0 ? theme.onAccent : theme.ink }}
              >
                {b.label}
              </span>
            </span>
            <span
              className="shrink-0 text-[clamp(0.85rem,1.6vw,1.1rem)] font-bold tabular-nums"
              style={{ color: i === 0 ? theme.onAccent : theme.ink }}
            >
              {fmt(b.value)}
              {suffix && (
                <span className="ml-1 text-[0.65em] font-semibold opacity-60">
                  {suffix}
                </span>
              )}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

const SEGMENT_HUES = [
  "#2447f0",
  "#ff4d2e",
  "#0e9f8e",
  "#f5a524",
  "#7c3aed",
  "#7d9412",
];

/** Proportional colour field — one bar, whole story. */
export function SegmentField({
  segments,
  theme,
  reduceMotion,
}: {
  segments: NonNullable<WrappedScene["segments"]>;
  theme: SceneTheme;
  reduceMotion: boolean;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (segments.length === 0 || total <= 0) return null;
  return (
    <div className="min-w-0">
      <div
        className="flex h-14 w-full overflow-hidden rounded-xl sm:h-20"
        role="img"
        aria-label={segments
          .map(
            (s) => `${s.label} ${Math.round((s.value / total) * 100)} percent`
          )
          .join(", ")}
      >
        {segments.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "group relative min-w-0 transition-[filter] duration-200 hover:brightness-110",
              !reduceMotion && "gc-in-wipe-across"
            )}
            style={{
              flex: `${s.value} 1 0%`,
              background: SEGMENT_HUES[i % SEGMENT_HUES.length],
              animationDelay: reduceMotion ? undefined : `${0.1 + i * 0.09}s`,
            }}
            title={`${s.label} · ${Math.round((s.value / total) * 100)}%`}
          />
        ))}
      </div>
      <ul className="gc-stagger mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s, i) => (
          <li
            key={s.label}
            className="flex items-center gap-2 text-[0.78rem] font-semibold sm:text-sm"
            style={{ color: theme.ink }}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: SEGMENT_HUES[i % SEGMENT_HUES.length] }}
            />
            {s.label}
            <span className="tabular-nums" style={{ color: theme.inkSoft }}>
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 24-hour radial dial — the coding-rhythm hero visual. */
export function HourDial({
  bars,
  theme,
  reduceMotion,
  peakHour,
}: {
  bars: NonNullable<WrappedScene["bars"]>;
  theme: SceneTheme;
  reduceMotion: boolean;
  peakHour: number;
}) {
  // viewBox is sized so the outer hour labels stay inside the canvas
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const inner = 62;
  const outer = 140;
  const labelRadius = outer + 20;
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full max-h-[50vh] w-full max-w-[min(80vw,30rem)]"
      role="img"
      aria-label={`Radial chart of commits per hour, peak at ${peakHour}:00 UTC`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={outer + 8}
        fill="none"
        stroke={theme.rule}
        strokeWidth={1}
      />
      <circle
        cx={cx}
        cy={cy}
        r={inner - 8}
        fill="none"
        stroke={theme.rule}
        strokeWidth={1}
      />
      {bars.map((b, i) => {
        const angle = (i / bars.length) * Math.PI * 2 - Math.PI / 2;
        // Every hour keeps a visible stub so the dial reads as a clock face
        const len = inner + 8 + (b.value / max) * (outer - inner - 8);
        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * len;
        const y2 = cy + Math.sin(angle) * len;
        const isPeak = i === peakHour;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isPeak ? theme.accent : theme.ink}
            strokeOpacity={isPeak ? 1 : 0.34}
            strokeWidth={isPeak ? 9 : 6}
            strokeLinecap="round"
            className={!reduceMotion ? "gc-in-pop" : undefined}
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              animationDelay: reduceMotion ? undefined : `${0.1 + i * 0.02}s`,
            }}
          />
        );
      })}
      {[0, 6, 12, 18].map((h) => {
        const angle = (h / 24) * Math.PI * 2 - Math.PI / 2;
        return (
          <text
            key={h}
            x={cx + Math.cos(angle) * labelRadius}
            y={cy + Math.sin(angle) * labelRadius + 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill={theme.inkSoft}
          >
            {String(h).padStart(2, "0")}
          </text>
        );
      })}
    </svg>
  );
}

/** Streak chain — a run of day blocks. */
export function StreakChain({
  days,
  theme,
  reduceMotion,
}: {
  days: number;
  theme: SceneTheme;
  reduceMotion: boolean;
}) {
  const shown = Math.min(days, 42);
  const cells = Array.from({ length: Math.max(shown, 1) }, (_, i) => i);
  // Short streaks get bigger blocks so the run still carries the composition
  const cell =
    shown <= 8
      ? "h-9 w-9 rounded-[7px] sm:h-14 sm:w-14"
      : shown <= 20
        ? "h-7 w-7 rounded-[6px] sm:h-10 sm:w-10"
        : "h-6 w-6 rounded-[5px] sm:h-8 sm:w-8";
  return (
    <div
      className="flex flex-wrap gap-1.5 sm:gap-2"
      role="img"
      aria-label={`${days} consecutive active days`}
    >
      {cells.map((i) => (
        <span
          key={i}
          className={cn(cell, !reduceMotion && "gc-in-pop")}
          style={{
            background: theme.accent,
            opacity: 0.45 + 0.55 * ((i + 1) / cells.length),
            animationDelay: reduceMotion ? undefined : `${0.1 + i * 0.028}s`,
          }}
        />
      ))}
      {days > shown && (
        <span
          className="self-center pl-1 text-sm font-bold"
          style={{ color: theme.inkSoft }}
        >
          +{days - shown}
        </span>
      )}
    </div>
  );
}

/** Initials disc for a person. */
export function Monogram({
  name,
  theme,
  reduceMotion,
}: {
  name: string;
  theme: SceneTheme;
  reduceMotion: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className={cn(
        "relative grid aspect-square w-[clamp(6rem,17vw,11rem)] shrink-0 place-items-center rounded-full",
        !reduceMotion && "gc-in-pop"
      )}
      style={{ background: theme.accent }}
      aria-hidden
    >
      <span
        className="gc-numeral text-[clamp(2.2rem,6.5vw,4.2rem)]"
        style={{ color: theme.onAccent }}
      >
        {initials || "?"}
      </span>
    </div>
  );
}

/** Ascending spark — rising-star trajectory. */
export function SparkRise({
  theme,
  reduceMotion,
}: {
  theme: SceneTheme;
  reduceMotion: boolean;
}) {
  return (
    <svg
      viewBox="0 0 200 90"
      className="h-20 w-full max-w-sm sm:h-24"
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d="M2 84 C 46 82, 74 76, 104 56 S 158 16, 198 6"
        fill="none"
        stroke={theme.accent}
        strokeWidth={5}
        strokeLinecap="round"
        className={!reduceMotion ? "gc-draw" : undefined}
        style={{ ["--dash" as string]: "300" }}
      />
      <circle
        cx={198}
        cy={6}
        r={6}
        fill={theme.accent}
        className={!reduceMotion ? "gc-in-pop" : undefined}
        style={{ animationDelay: reduceMotion ? undefined : "1.2s" }}
      />
    </svg>
  );
}

/** Mono plate for a file path — splits directory from filename. */
export function PathPlate({
  path,
  theme,
  reduceMotion,
}: {
  path: string;
  theme: SceneTheme;
  reduceMotion: boolean;
}) {
  const i = path.lastIndexOf("/");
  const dir = i >= 0 ? path.slice(0, i + 1) : "";
  const base = i >= 0 ? path.slice(i + 1) : path;
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border px-4 py-3 sm:px-5 sm:py-4",
        !reduceMotion && "gc-in-rise"
      )}
      style={{ borderColor: theme.rule, background: theme.inset }}
    >
      <p
        className="gc-mono truncate text-[0.72rem] sm:text-sm"
        style={{ color: theme.inkSoft }}
      >
        {dir || "./"}
      </p>
      <p
        className="gc-mono truncate text-[clamp(1.1rem,3.4vw,2rem)] font-bold tracking-tight"
        style={{ color: theme.ink }}
      >
        {base}
      </p>
    </div>
  );
}

/** Diverging additions / deletions bar. */
export function ChurnBar({
  additions,
  deletions,
  theme,
  reduceMotion,
}: {
  additions: number;
  deletions: number;
  theme: SceneTheme;
  reduceMotion: boolean;
}) {
  const total = Math.max(1, additions + deletions);
  return (
    <div className="min-w-0">
      <div className="flex h-8 w-full overflow-hidden rounded-lg sm:h-10">
        <div
          className={cn("h-full", !reduceMotion && "gc-in-wipe-across")}
          style={{ width: `${(additions / total) * 100}%`, background: "#0e9f8e" }}
        />
        <div
          className={cn("h-full", !reduceMotion && "gc-in-wipe-across")}
          style={{
            width: `${(deletions / total) * 100}%`,
            background: "#ff4d2e",
            animationDelay: reduceMotion ? undefined : "0.14s",
          }}
        />
      </div>
      <div
        className="mt-2 flex justify-between text-[0.78rem] font-bold tabular-nums sm:text-sm"
        style={{ color: theme.ink }}
      >
        <span>+{fmt(additions)} added</span>
        <span>−{fmt(deletions)} removed</span>
      </div>
    </div>
  );
}

/** Horizontal rail of moments — eras, releases, migrations. */
export function RailTimeline({
  items,
  theme,
  reduceMotion,
}: {
  items: NonNullable<WrappedScene["list"]>;
  theme: SceneTheme;
  reduceMotion: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ol className="relative min-w-0">
      <span
        aria-hidden
        className="absolute left-[7px] top-2 bottom-2 w-px"
        style={{ background: theme.rule }}
      />
      {items.map((it, i) => (
        <li
          key={`${it.label}-${i}`}
          className={cn(
            "relative min-w-0 py-2.5 pl-8",
            !reduceMotion && "gc-in-left"
          )}
          style={{
            animationDelay: reduceMotion ? undefined : `${0.16 + i * 0.09}s`,
          }}
        >
          <span
            aria-hidden
            className="absolute left-0 top-[1.05rem] h-[15px] w-[15px] rounded-full border-[3px]"
            style={{
              borderColor: theme.accent,
              background: i === 0 ? theme.accent : "transparent",
            }}
          />
          <p
            className="truncate text-[clamp(1rem,2.2vw,1.5rem)] font-bold tracking-tight"
            style={{ color: theme.ink }}
          >
            {it.label}
          </p>
          <p
            className="truncate text-[0.78rem] font-medium tabular-nums sm:text-sm"
            style={{ color: theme.inkSoft }}
          >
            {it.value}
            {it.hint ? ` · ${it.hint}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
