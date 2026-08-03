"use client";

/**
 * One composition per scene type. Each layout owns a single strong visual
 * idea, its own grid, and its own typographic hierarchy — no shared template.
 */
import Link from "next/link";
import { Download, LayoutDashboard } from "lucide-react";
import type { WrappedScene, WrappedStory } from "@/lib/wrapped";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShareCardDownloader } from "./share-card";
import type { SceneTheme } from "./scene-theme";
import {
  ChurnBar,
  Chips,
  ColumnChart,
  CountUp,
  Eyebrow,
  HourDial,
  Lede,
  Monogram,
  PathPlate,
  RailTimeline,
  RankRows,
  SegmentField,
  SparkRise,
  StatRail,
  StreakChain,
  Title,
  fmt,
} from "./scene-parts";

export interface StageProps {
  scene: WrappedScene;
  theme: SceneTheme;
  reduceMotion: boolean;
  slug: string;
  story: WrappedStory;
}

/** Shared wrapper: full-height column with consistent gutters. */
function Frame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col justify-center", className)}>
      {children}
    </div>
  );
}

function Hero({
  scene,
  theme,
  reduceMotion,
  className,
}: {
  scene: WrappedScene;
  theme: SceneTheme;
  reduceMotion: boolean;
  className?: string;
}) {
  if (scene.hero === undefined) return null;
  return (
    <div className={cn("min-w-0", className)}>
      <CountUp
        value={scene.hero}
        reduceMotion={reduceMotion}
        className={cn(
          "gc-numeral block text-[clamp(3.4rem,15vw,10rem)]",
          !reduceMotion && "gc-in-pop"
        )}
        style={{ color: theme.accent }}
      />
      {scene.heroLabel && (
        <p
          className="gc-eyebrow mt-2 text-[0.6rem] sm:text-[0.66rem]"
          style={{ color: theme.inkSoft }}
        >
          {scene.heroLabel}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════ 1. Opening ══════════════════════════ */

function OpeningStage({ scene, theme, reduceMotion }: StageProps) {
  const metrics = scene.metrics ?? [];
  return (
    <Frame className="gap-6">
      <div className="min-w-0">
        <Eyebrow theme={theme} className={!reduceMotion ? "gc-in-drop" : ""}>
          {scene.kicker}
        </Eyebrow>
        <Title
          size="xl"
          className={cn("mt-3 break-words", !reduceMotion && "gc-in-rise")}
          style={{ color: theme.ink, animationDelay: "0.08s" }}
        >
          {scene.title}
        </Title>
        <div
          className={cn("mt-5 h-1.5 w-28 rounded-full", !reduceMotion && "gc-in-left")}
          style={{ background: theme.accent, animationDelay: "0.3s" }}
        />
        <Lede
          theme={theme}
          className={cn("mt-5", !reduceMotion && "gc-in-rise")}
        >
          {scene.subtitle}
        </Lede>
        {scene.body && (
          <p
            className="gc-mono mt-2 text-[0.72rem] sm:text-sm"
            style={{ color: theme.inkSoft }}
          >
            {scene.body}
          </p>
        )}
      </div>

      {metrics.length > 0 && (
        <dl className="gc-stagger grid grid-cols-3 gap-4 sm:gap-8">
          {metrics.slice(0, 3).map((m) => (
            <div
              key={m.label}
              className="min-w-0 border-t-2 pt-3"
              style={{ borderColor: theme.accent }}
            >
              <dd
                className="gc-numeral text-[clamp(1.7rem,5.5vw,3.4rem)]"
                style={{ color: theme.ink }}
              >
                {typeof m.value === "number" ? fmt(m.value) : m.value}
              </dd>
              <dt
                className="gc-eyebrow mt-1.5 truncate text-[0.58rem]"
                style={{ color: theme.inkSoft }}
              >
                {m.label}
              </dt>
            </div>
          ))}
        </dl>
      )}
    </Frame>
  );
}

/* ══════════════════════════ 2. Beginning ══════════════════════════ */

function BeginningStage({ scene, theme, reduceMotion }: StageProps) {
  const list = (scene.list ?? []).slice(0, 4);
  return (
    <Frame className="gap-6 md:grid md:grid-cols-[1fr_0.85fr] md:items-center md:gap-12">
      <div className="min-w-0">
        <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
        <p
          className={cn(
            "gc-numeral mt-3 text-[clamp(2.6rem,10vw,6.5rem)]",
            !reduceMotion && "gc-in-left"
          )}
          style={{ color: theme.accent }}
        >
          {scene.hero}
        </p>
        <Title
          size="sm"
          className={cn("mt-3", !reduceMotion && "gc-in-rise")}
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
        <Lede theme={theme} className="mt-2.5">
          {scene.subtitle}
        </Lede>
      </div>

      {list.length > 0 && (
        <ul
          className="gc-stagger min-w-0 divide-y rounded-xl border px-4 py-1 sm:px-5"
          style={{ borderColor: theme.rule, background: theme.inset }}
        >
          {list.map((it, i) => (
            <li
              key={`${it.label}-${i}`}
              className="min-w-0 py-2.5"
              style={{ borderColor: theme.rule }}
            >
              <p
                className="gc-eyebrow text-[0.55rem]"
                style={{ color: theme.inkSoft }}
              >
                {it.label}
              </p>
              <p
                className="gc-mono mt-0.5 truncate text-[0.85rem] font-semibold sm:text-base"
                style={{ color: theme.ink }}
              >
                {it.value}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}

/* ══════════════════════════ 3. Headline ══════════════════════════ */

function HeadlineStage({ scene, theme, reduceMotion }: StageProps) {
  return (
    <Frame className="gap-5">
      <div className="min-w-0">
        <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
        <CountUp
          value={scene.hero ?? 0}
          reduceMotion={reduceMotion}
          className={cn(
            "gc-numeral mt-1 block text-[clamp(4.5rem,21vw,14rem)] leading-[0.78]",
            !reduceMotion && "gc-in-left"
          )}
          style={{ color: theme.ink }}
        />
        <p
          className="gc-eyebrow mt-2.5 text-[0.6rem] sm:text-[0.68rem]"
          style={{ color: theme.inkSoft }}
        >
          {scene.heroLabel}
        </p>
        <Title
          size="md"
          className={cn("mt-3 max-w-[18ch]", !reduceMotion && "gc-in-rise")}
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
        <Lede theme={theme} className="mt-2">
          {scene.subtitle}
        </Lede>
      </div>

      {scene.series && scene.series.length > 1 && (
        <div className="hidden min-w-0 sm:block">
          <ColumnChart
            series={scene.series}
            theme={theme}
            reduceMotion={reduceMotion}
            height="h-24 lg:h-32"
          />
        </div>
      )}

      <StatRail
        metrics={(scene.metrics ?? []).slice(0, 3)}
        theme={theme}
        columns="grid-cols-3"
      />
    </Frame>
  );
}

/* ══════════════════════════ 4. Busiest day ══════════════════════════ */

function BusiestStage({ scene, theme, reduceMotion }: StageProps) {
  return (
    <Frame className="gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
          <Title
            size="lg"
            className={cn("mt-2 max-w-[15ch]", !reduceMotion && "gc-in-drop")}
            style={{ color: theme.ink }}
          >
            {scene.title}
          </Title>
        </div>
        <div
          className={cn(
            "shrink-0 rounded-2xl px-5 py-3 text-left sm:text-right",
            !reduceMotion && "gc-in-pop"
          )}
          style={{ background: theme.accent }}
        >
          <CountUp
            value={scene.hero ?? 0}
            reduceMotion={reduceMotion}
            className="gc-numeral block text-[clamp(2.4rem,8vw,4.5rem)]"
            style={{ color: theme.onAccent }}
          />
          <p
            className="gc-eyebrow mt-1 text-[0.54rem]"
            style={{ color: theme.onAccent, opacity: 0.85 }}
          >
            {scene.heroLabel}
          </p>
        </div>
      </div>

      <Lede theme={theme}>{scene.subtitle}</Lede>

      {scene.series && scene.series.length > 1 && (
        <ColumnChart
          series={scene.series}
          theme={theme}
          reduceMotion={reduceMotion}
          height="h-28 sm:h-44"
        />
      )}

      <StatRail
        metrics={(scene.metrics ?? []).slice(0, 3)}
        theme={theme}
        columns="grid-cols-1 sm:grid-cols-3"
      />
    </Frame>
  );
}

/* ══════════════════════════ 5. Proportional field ══════════════════════════ */

function SegmentStage({ scene, theme, reduceMotion }: StageProps) {
  const list = (scene.list ?? []).slice(0, 4);
  return (
    <Frame className="gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
          <Title
            size="lg"
            className={cn("mt-2", !reduceMotion && "gc-in-rise")}
            style={{ color: theme.ink }}
          >
            {scene.title}
          </Title>
        </div>
        {scene.hero !== undefined && (
          <p
            className={cn(
              "gc-numeral text-[clamp(2.6rem,9vw,5.5rem)]",
              !reduceMotion && "gc-in-pop"
            )}
            style={{ color: theme.accent }}
          >
            {scene.hero}
          </p>
        )}
      </div>

      <Lede theme={theme}>{scene.subtitle}</Lede>

      {scene.segments && (
        <SegmentField
          segments={scene.segments}
          theme={theme}
          reduceMotion={reduceMotion}
        />
      )}

      {list.length > 0 && (
        <ul
          className="gc-stagger hidden grid-cols-2 gap-x-8 gap-y-2 sm:grid lg:grid-cols-4"
          aria-label="Busiest directories"
        >
          {list.map((it, i) => (
            <li
              key={`${it.label}-${i}`}
              className="min-w-0 border-t pt-2"
              style={{ borderColor: theme.rule }}
            >
              <p
                className="gc-mono truncate text-sm font-bold"
                style={{ color: theme.ink }}
              >
                {it.label}
              </p>
              <p
                className="truncate text-[0.72rem] tabular-nums"
                style={{ color: theme.inkSoft }}
              >
                {fmt(Number(it.value) || 0)} churn · {it.hint}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}

/* ══════════════════════════ 6. Rhythm dial ══════════════════════════ */

function RhythmStage({ scene, theme, reduceMotion }: StageProps) {
  const bars = scene.bars ?? [];
  const peak = bars.reduce(
    (best, b, i) => (b.value > (bars[best]?.value ?? -1) ? i : best),
    0
  );
  return (
    <Frame className="gap-6 md:grid md:grid-cols-[0.95fr_1fr] md:items-center md:gap-10">
      <div className="min-w-0">
        <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
        <Title
          size="lg"
          className={cn("mt-2 max-w-[13ch]", !reduceMotion && "gc-in-rise")}
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
        <p
          className={cn(
            "gc-numeral mt-4 text-[clamp(2.6rem,9vw,5rem)]",
            !reduceMotion && "gc-in-pop"
          )}
          style={{ color: theme.accent }}
        >
          {scene.hero}
        </p>
        <p className="gc-eyebrow mt-1.5 text-[0.58rem]" style={{ color: theme.inkSoft }}>
          {scene.heroLabel}
        </p>
        <Lede theme={theme} className="mt-4 hidden sm:block">
          {scene.subtitle}
        </Lede>
      </div>

      {bars.length === 24 && (
        <div className="flex min-h-0 items-center justify-center">
          <HourDial
            bars={bars}
            theme={theme}
            reduceMotion={reduceMotion}
            peakHour={peak}
          />
        </div>
      )}
    </Frame>
  );
}

/* ══════════════════════════ 7. Streak ══════════════════════════ */

function StreakStage({ scene, theme, reduceMotion }: StageProps) {
  const days = typeof scene.hero === "number" ? scene.hero : 0;
  return (
    <Frame className="gap-7">
      <div className="min-w-0">
        <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
        <Title
          size="lg"
          className={cn("mt-2 max-w-[16ch]", !reduceMotion && "gc-in-left")}
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <div className="shrink-0">
          <CountUp
            value={days}
            reduceMotion={reduceMotion}
            className={cn(
              "gc-numeral block text-[clamp(4rem,16vw,10rem)]",
              !reduceMotion && "gc-in-pop"
            )}
            style={{ color: theme.accent }}
          />
          <p
            className="gc-eyebrow mt-1 text-[0.58rem]"
            style={{ color: theme.inkSoft }}
          >
            {scene.heroLabel}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <StreakChain days={days} theme={theme} reduceMotion={reduceMotion} />
        </div>
      </div>

      <Lede theme={theme}>{scene.subtitle}</Lede>
      <StatRail
        metrics={(scene.metrics ?? []).slice(0, 2)}
        theme={theme}
        columns="grid-cols-1 sm:grid-cols-2"
      />
    </Frame>
  );
}

/* ══════════════════════════ 8. Ensemble ══════════════════════════ */

function EnsembleStage({ scene, theme, reduceMotion }: StageProps) {
  const bars = (scene.bars ?? []).slice(0, 5);
  return (
    <Frame className="gap-5">
      <div className="min-w-0">
        <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
        <Title
          size="lg"
          className={cn("mt-2 max-w-[16ch]", !reduceMotion && "gc-in-rise")}
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
        <Lede theme={theme} className="mt-2">
          {scene.subtitle}
        </Lede>
      </div>
      <RankRows
        bars={bars}
        theme={theme}
        reduceMotion={reduceMotion}
        suffix="commits"
      />
    </Frame>
  );
}

/* ══════════════════════════ 9. Person portrait ══════════════════════════ */

function PersonStage({ scene, theme, reduceMotion }: StageProps) {
  const rising = scene.type === "rising_star";
  return (
    <Frame className="gap-6">
      <div className="flex flex-wrap items-center gap-5 sm:gap-8">
        <Monogram
          name={scene.title}
          theme={theme}
          reduceMotion={reduceMotion}
        />
        <div className="min-w-0 flex-1">
          <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
          <Title
            size="lg"
            className={cn("mt-1.5 break-words", !reduceMotion && "gc-in-left")}
            style={{ color: theme.ink }}
          >
            {scene.title}
          </Title>
          <CountUp
            value={scene.hero ?? 0}
            reduceMotion={reduceMotion}
            className="gc-numeral mt-3 block text-[clamp(2rem,6vw,3.6rem)]"
            style={{ color: theme.accent }}
          />
          <p
            className="gc-eyebrow mt-1.5 text-[0.56rem]"
            style={{ color: theme.inkSoft }}
          >
            {scene.heroLabel}
          </p>
        </div>
      </div>

      <Lede theme={theme}>{scene.subtitle}</Lede>

      {rising && <SparkRise theme={theme} reduceMotion={reduceMotion} />}

      <StatRail
        metrics={(scene.metrics ?? []).slice(0, 3)}
        theme={theme}
        columns="grid-cols-1 sm:grid-cols-3"
      />
      {scene.chips && <Chips chips={scene.chips.slice(0, 4)} theme={theme} />}
    </Frame>
  );
}

/* ══════════════════════════ 10. File plate ══════════════════════════ */

function FileStage({ scene, theme, reduceMotion }: StageProps) {
  const metrics = scene.metrics ?? [];
  const additions = Number(
    String(metrics.find((m) => /born|addition/i.test(m.label))?.value ?? "")
      .replace(/[^\d]/g, "")
  );
  const deletions = Number(
    String(metrics.find((m) => /yeet|deletion/i.test(m.label))?.value ?? "")
      .replace(/[^\d]/g, "")
  );
  const hasChurn = additions > 0 || deletions > 0;
  // Subtitle leads with the path for busiest_file — the plate already shows it
  const [head, ...rest] = scene.subtitle.split(" — ");
  const path = head && head.includes("/") ? head : scene.title;
  const lede = rest.length > 0 ? rest.join(" — ") : scene.subtitle;

  return (
    <Frame className="gap-6">
      <div className="min-w-0">
        <Eyebrow theme={theme} className="mb-2">
          {scene.kicker}
        </Eyebrow>
        <PathPlate path={path} theme={theme} reduceMotion={reduceMotion} />
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <div className="shrink-0">
          <CountUp
            value={scene.hero ?? 0}
            reduceMotion={reduceMotion}
            className={cn(
              "gc-numeral block text-[clamp(3rem,12vw,7rem)]",
              !reduceMotion && "gc-in-pop"
            )}
            style={{ color: theme.accent }}
          />
          <p
            className="gc-eyebrow mt-2 text-[0.58rem]"
            style={{ color: theme.inkSoft }}
          >
            {scene.heroLabel}
          </p>
        </div>
        <Lede theme={theme} className="min-w-[16ch] flex-1 pb-1">
          {lede}
        </Lede>
      </div>

      {hasChurn ? (
        <ChurnBar
          additions={additions}
          deletions={deletions}
          theme={theme}
          reduceMotion={reduceMotion}
        />
      ) : (
        <StatRail
          metrics={metrics.slice(0, 3)}
          theme={theme}
          columns="grid-cols-1 sm:grid-cols-3"
        />
      )}
      {scene.chips && <Chips chips={scene.chips.slice(0, 3)} theme={theme} />}
    </Frame>
  );
}

/* ══════════════════════════ 11. Boss-fight commit ══════════════════════════ */

function CommitStage({ scene, theme, reduceMotion }: StageProps) {
  return (
    <Frame className="gap-6">
      <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
      <div
        className={cn(
          "min-w-0 rounded-2xl border-2 p-5 sm:p-7",
          !reduceMotion && "gc-in-tilt"
        )}
        style={{ borderColor: theme.accent, background: theme.inset }}
      >
        <p
          className="gc-mono text-[0.68rem] uppercase tracking-[0.2em]"
          style={{ color: theme.inkSoft }}
        >
          commit
        </p>
        <Title
          size="md"
          className="mt-2 max-w-[22ch] break-words"
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
        <p
          className="gc-mono mt-3 text-[0.75rem] sm:text-sm"
          style={{ color: theme.inkSoft }}
        >
          {scene.subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <div className="shrink-0">
          <CountUp
            value={scene.hero ?? 0}
            reduceMotion={reduceMotion}
            className={cn(
              "gc-numeral block text-[clamp(3rem,12vw,7rem)]",
              !reduceMotion && "gc-in-pop"
            )}
            style={{ color: theme.accent }}
          />
          <p
            className="gc-eyebrow mt-1 text-[0.58rem]"
            style={{ color: theme.inkSoft }}
          >
            {scene.heroLabel}
          </p>
        </div>
        <StatRail
          metrics={(scene.metrics ?? []).slice(0, 2)}
          theme={theme}
          className="min-w-[14rem] flex-1"
          columns="grid-cols-2"
        />
      </div>
    </Frame>
  );
}

/* ══════════════════════════ 12. Rail (eras, releases, pairs) ══════════════════════════ */

function RailStage({ scene, theme, reduceMotion }: StageProps) {
  return (
    <Frame className="gap-6 md:grid md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-12">
      <div className="min-w-0">
        <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
        <Title
          size="lg"
          className={cn("mt-2 max-w-[14ch]", !reduceMotion && "gc-in-rise")}
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
        <Lede theme={theme} className="mt-3">
          {scene.subtitle}
        </Lede>
      </div>
      <RailTimeline
        items={(scene.list ?? []).slice(0, 4)}
        theme={theme}
        reduceMotion={reduceMotion}
      />
    </Frame>
  );
}

/* ══════════════════════════ 13. Plot twist ══════════════════════════ */

function TwistStage({ scene, theme, reduceMotion }: StageProps) {
  return (
    <Frame className="items-start gap-6">
      <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
      <Title
        size="xl"
        className={cn("max-w-[13ch] break-words", !reduceMotion && "gc-in-zoom")}
        style={{ color: theme.ink }}
      >
        {scene.title}
      </Title>
      <div
        className={cn("h-1.5 w-40 rounded-full", !reduceMotion && "gc-in-left")}
        style={{ background: theme.accent, animationDelay: "0.28s" }}
      />
      <Lede theme={theme} className="text-[clamp(1rem,2vw,1.4rem)]">
        {scene.subtitle}
      </Lede>
      <Hero scene={scene} theme={theme} reduceMotion={reduceMotion} />
    </Frame>
  );
}

/* ══════════════════════════ 14. Personality emblem ══════════════════════════ */

function EmblemStage({ scene, theme, reduceMotion }: StageProps) {
  return (
    <Frame className="gap-6 md:grid md:grid-cols-[1.15fr_0.85fr] md:items-center md:gap-12">
      <div className="min-w-0">
        <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
        <Title
          size="xl"
          className={cn("mt-3 max-w-[12ch]", !reduceMotion && "gc-in-rise")}
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
        <Lede theme={theme} className="mt-4">
          {scene.subtitle}
        </Lede>
        {scene.chips && (
          <Chips chips={scene.chips.slice(0, 3)} theme={theme} className="mt-5" />
        )}
      </div>

      <div className="hidden justify-center md:flex">
        <div
          className={cn(
            "relative grid aspect-square w-[min(24vw,17rem)] place-items-center rounded-full border-[3px]",
            !reduceMotion && "gc-in-pop"
          )}
          style={{ borderColor: theme.accent }}
          aria-hidden
        >
          <div
            className={cn(
              "absolute inset-5 rounded-full border-2 border-dashed",
              !reduceMotion && "gc-spin-slow"
            )}
            style={{ borderColor: theme.rule }}
          />
          <span
            className="gc-numeral px-6 text-center text-[clamp(1.6rem,3.4vw,2.6rem)] leading-[0.95]"
            style={{ color: theme.accent }}
          >
            {scene.title
              .split(/\s+/)
              .map((w) => w[0]?.toUpperCase())
              .join("")}
          </span>
        </div>
      </div>
    </Frame>
  );
}

/* ══════════════════════════ 15. Recap mosaic ══════════════════════════ */

const MOSAIC_TINT = [
  "#2447f0",
  "#ff4d2e",
  "#0e9f8e",
  "#f5a524",
  "#7c3aed",
  "#7d9412",
];

function RecapStage({ scene, theme, reduceMotion }: StageProps) {
  const metrics = (scene.metrics ?? []).slice(0, 6);
  return (
    <Frame className="gap-5">
      <div className="min-w-0">
        <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
        <Title
          size="md"
          className={cn("mt-2", !reduceMotion && "gc-in-rise")}
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
        <Lede theme={theme} className="mt-1.5">
          {scene.subtitle}
        </Lede>
      </div>
      <dl className="gc-stagger grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="min-w-0 overflow-hidden rounded-xl px-3.5 py-3 sm:px-4 sm:py-4"
            style={{
              background: `color-mix(in srgb, ${MOSAIC_TINT[i % 6]} ${theme.mode === "dark" ? 26 : 14}%, transparent)`,
              borderLeft: `3px solid ${MOSAIC_TINT[i % 6]}`,
            }}
          >
            <dt
              className="gc-eyebrow truncate text-[0.54rem]"
              style={{ color: theme.inkSoft }}
            >
              {m.label}
            </dt>
            <dd
              className="mt-1 truncate text-[clamp(1.15rem,3vw,2rem)] font-extrabold tabular-nums tracking-tight"
              style={{ color: theme.ink }}
              title={String(m.value)}
            >
              {typeof m.value === "number" ? fmt(m.value) : m.value}
            </dd>
          </div>
        ))}
      </dl>
    </Frame>
  );
}

/* ══════════════════════════ 16. Closing ══════════════════════════ */

function ClosingStage({ scene, theme, reduceMotion, slug, story }: StageProps) {
  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="min-w-0 shrink-0">
        <Eyebrow theme={theme}>{scene.kicker}</Eyebrow>
        <Title
          size="lg"
          className={cn("mt-2", !reduceMotion && "gc-in-zoom")}
          style={{ color: theme.ink }}
        >
          {scene.title}
        </Title>
        <Lede theme={theme} className="mt-2">
          {scene.subtitle}
        </Lede>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2.5">
        <Button asChild size="sm" variant="lime">
          <Link href={`/repo/${slug}`} data-testid="cta-analytics">
            <LayoutDashboard className="h-4 w-4" />
            Open analytics
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          style={{ borderColor: theme.rule, color: theme.ink }}
        >
          <a
            href={`/api/repos/${slug}/export?type=report`}
            data-testid="cta-report"
          >
            <Download className="h-4 w-4" />
            Report
          </a>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          style={{ borderColor: theme.rule, color: theme.ink }}
        >
          <Link href="/" data-testid="cta-another">
            Another repo
          </Link>
        </Button>
      </div>

      <div className="shrink-0 pb-1" data-testid="wrapped-closing">
        <p
          className="gc-eyebrow mb-2.5 text-[0.58rem]"
          style={{ color: theme.inkSoft }}
        >
          Share cards
        </p>
        <ShareCardDownloader cards={story.shareCards} theme={theme} />
      </div>
    </div>
  );
}

/* ══════════════════════════ router ══════════════════════════ */

const STAGES: Partial<
  Record<WrappedScene["type"], (p: StageProps) => React.ReactElement>
> = {
  opening: OpeningStage,
  beginning: BeginningStage,
  headline: HeadlineStage,
  busiest: BusiestStage,
  commit_personality: SegmentStage,
  favorites: SegmentStage,
  rhythm: RhythmStage,
  streak: StreakStage,
  people: EnsembleStage,
  main_character: PersonStage,
  rising_star: PersonStage,
  busiest_file: FileStage,
  dramatic_file: FileStage,
  giant_commit: CommitStage,
  architecture: RailStage,
  releases: RailStage,
  collaboration: RailStage,
  cochange: RailStage,
  plot_twist: TwistStage,
  personality: EmblemStage,
  recap: RecapStage,
  closing: ClosingStage,
};

export function SceneStage(props: StageProps) {
  const Stage = STAGES[props.scene.type] ?? TwistStage;
  return <Stage {...props} />;
}
