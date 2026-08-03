"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import type { WrappedScene, WrappedStory } from "@/lib/wrapped";
import { ShareCardDownloader } from "./share-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PALETTES: Record<
  WrappedScene["palette"],
  { bg: string; accent: string; glow: string }
> = {
  aurora: {
    bg: "from-[#04151a] via-[#0b1f2a] to-[#1a1040]",
    accent: "text-teal-300",
    glow: "bg-teal-400/20",
  },
  ember: {
    bg: "from-[#1a0a08] via-[#2a1210] to-[#1a1030]",
    accent: "text-orange-300",
    glow: "bg-orange-400/20",
  },
  midnight: {
    bg: "from-[#05070f] via-[#0a1020] to-[#101828]",
    accent: "text-sky-300",
    glow: "bg-sky-400/15",
  },
  forest: {
    bg: "from-[#04140f] via-[#0a1f18] to-[#0f1a28]",
    accent: "text-emerald-300",
    glow: "bg-emerald-400/20",
  },
  violet: {
    bg: "from-[#0c0618] via-[#1a0f30] to-[#0a1528]",
    accent: "text-violet-300",
    glow: "bg-violet-400/20",
  },
  slate: {
    bg: "from-[#0b0e14] via-[#141a24] to-[#1a2030]",
    accent: "text-slate-200",
    glow: "bg-slate-400/15",
  },
  ocean: {
    bg: "from-[#031018] via-[#0a2238] to-[#0c1830]",
    accent: "text-cyan-300",
    glow: "bg-cyan-400/20",
  },
  gold: {
    bg: "from-[#141008] via-[#2a2010] to-[#1a1020]",
    accent: "text-amber-200",
    glow: "bg-amber-400/20",
  },
};

export function WrappedPlayer({
  story,
  slug,
}: {
  story: WrappedStory;
  slug: string;
}) {
  const scenes = story.scenes;
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(true);
  // Prefer CSS media query for reduced motion (no store hydration edge cases)
  const [reduceMotion, setReduceMotion] = useState(false);
  const scene = scenes[index];
  const touchX = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Subscribe first; initial match applied asynchronously to avoid sync setState-in-effect lint
    const apply = () => setReduceMotion(mq.matches);
    const id = requestAnimationFrame(apply);
    mq.addEventListener("change", apply);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener("change", apply);
    };
  }, []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(scenes.length - 1, i + 1));
  }, [scenes.length]);
  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);
  const goTo = useCallback(
    (i: number) => {
      setIndex(Math.max(0, Math.min(scenes.length - 1, i)));
    },
    [scenes.length]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(scenes.length - 1);
      } else if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    const w = window as Window & {
      __gcWrapped?: { next: () => void; prev: () => void; goTo: (i: number) => void };
    };
    w.__gcWrapped = { next, prev, goTo };
    return () => {
      window.removeEventListener("keydown", onKey);
      delete w.__gcWrapped;
    };
  }, [next, prev, goTo, fullscreen, scenes.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? 0;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const x = e.changedTouches[0]?.clientX ?? 0;
    const dx = x - touchX.current;
    if (dx < -50) next();
    if (dx > 50) prev();
  };

  if (!scene) {
    return (
      <p className="p-8 text-muted-foreground">No Wrapped scenes available.</p>
    );
  }

  const pal = PALETTES[scene.palette];
  const progress = ((index + 1) / scenes.length) * 100;
  const isClosing = scene.type === "closing";

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden text-white",
        fullscreen
          ? "fixed inset-0 z-50"
          : "min-h-[70vh] max-h-[90vh] rounded-2xl border border-border"
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="GitChronicle Wrapped story"
      data-testid="wrapped-player"
      tabIndex={0}
    >
      {/* Background — must not intercept clicks/keys */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br",
          pal.bg,
          !reduceMotion && "transition-colors duration-500"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full blur-3xl",
          pal.glow
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl",
          pal.glow
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
      />

      {/* Progress — fixed chrome; larger hit targets for touch/click */}
      <div
        className="relative z-10 flex shrink-0 gap-0.5 px-3 pt-2 sm:gap-1 sm:px-6 sm:pt-3"
        data-testid="wrapped-progress"
        role="tablist"
        aria-label="Wrapped scenes"
      >
        {scenes.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-label={`Scene ${i + 1}: ${s.title}`}
            aria-current={i === index ? "true" : undefined}
            data-scene-index={i}
            data-scene-type={s.type}
            data-testid={`wrapped-scene-tab-${s.type}`}
            onClick={() => goTo(i)}
            className="relative z-20 flex h-6 flex-1 items-center py-2"
          >
            <span className="block h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <span
                className={cn(
                  "block h-full rounded-full bg-white/90",
                  i < index && "w-full",
                  i === index && "w-full",
                  i > index && "w-0",
                  !reduceMotion && i === index && "transition-all duration-300"
                )}
                style={i === index ? { width: "100%" } : undefined}
              />
            </span>
          </button>
        ))}
      </div>

      {/* Header chrome — fixed */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Sparkles className="h-3.5 w-3.5 text-teal-300" />
          <span className="font-medium tracking-wide">WRAPPED</span>
          <span className="tabular-nums" data-testid="wrapped-counter">
            {index + 1}/{scenes.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            asChild
          >
            <Link href={`/repo/${slug}`}>
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={() => setFullscreen((f) => !f)}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Scene body — scrollable so closing CTAs/share cards are always reachable */}
      <div
        key={scene.id}
        className={cn(
          "relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-12 sm:py-10 md:px-20",
          isClosing || scene.list || scene.metrics
            ? "flex flex-col justify-start"
            : "flex flex-col justify-center",
          !reduceMotion && "gc-scene-enter"
        )}
        aria-live="polite"
        data-testid="wrapped-scene-body"
        data-scene-type={scene.type}
      >
        {scene.kicker && (
          <p
            className={cn(
              "mb-3 text-xs font-semibold uppercase tracking-[0.2em] sm:text-sm",
              pal.accent
            )}
          >
            {scene.kicker}
          </p>
        )}
        <h2 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          {scene.title}
        </h2>
        <p className="mt-4 max-w-2xl text-base text-white/70 sm:text-lg md:text-xl">
          {scene.subtitle}
        </p>
        {scene.body && (
          <p className="mt-2 font-mono text-sm text-white/50">{scene.body}</p>
        )}

        {scene.hero !== undefined && (
          <div className="mt-8">
            <div
              className={cn(
                "text-6xl font-bold tabular-nums tracking-tight sm:text-7xl md:text-8xl",
                pal.accent
              )}
            >
              <CountUp
                value={scene.hero}
                reduceMotion={reduceMotion}
                key={`${scene.id}-hero`}
              />
            </div>
            {scene.heroLabel && (
              <div className="mt-1 text-sm uppercase tracking-wide text-white/50">
                {scene.heroLabel}
              </div>
            )}
          </div>
        )}

        {scene.metrics && scene.metrics.length > 0 && (
          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {scene.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm"
              >
                <dt className="text-[10px] uppercase tracking-wide text-white/45">
                  {m.label}
                </dt>
                <dd className="mt-0.5 truncate text-lg font-semibold tabular-nums">
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {scene.bars && scene.bars.length > 0 && scene.bars.length <= 12 && (
          <div className="mt-8 max-w-xl space-y-2">
            {scene.bars.slice(0, 8).map((b) => (
              <div key={b.label} className="flex items-center gap-3 text-sm">
                <span className="w-24 truncate text-white/60 sm:w-32">
                  {b.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-indigo-400"
                    style={{
                      width: `${Math.max(4, (b.value / Math.max(1, b.max)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums text-white/70">
                  {b.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Hour histogram compact for rhythm */}
        {scene.type === "rhythm" && scene.bars && scene.bars.length === 24 && (
          <div className="mt-8 flex h-24 max-w-2xl items-end gap-0.5">
            {scene.bars.map((b) => (
              <div
                key={b.label}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-500/80 to-teal-300/90"
                style={{
                  height: `${Math.max(4, (b.value / Math.max(1, b.max)) * 100)}%`,
                }}
                title={`${b.label}:00 — ${b.value}`}
              />
            ))}
          </div>
        )}

        {scene.list && scene.list.length > 0 && (
          <ul className="mt-8 max-w-xl space-y-2">
            {scene.list.slice(0, 8).map((item, i) => (
              <li
                key={`${item.label}-${i}`}
                className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2 text-sm"
              >
                <span className="truncate font-medium">{item.label}</span>
                <span className="shrink-0 tabular-nums text-white/60">
                  {item.value}
                  {item.hint ? (
                    <span className="ml-2 text-white/40">{item.hint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}

        {scene.chips && scene.chips.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {scene.chips.map((c) => (
              <span
                key={c}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {isClosing && (
          <div
            className="mt-10 max-w-2xl space-y-6 pb-4"
            data-testid="wrapped-closing"
          >
            <ShareCardDownloader cards={story.shareCards} />
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-teal-400 text-teal-950 hover:bg-teal-300">
                <Link href={`/repo/${slug}`} data-testid="cta-analytics">
                  <LayoutDashboard className="h-4 w-4" />
                  Open analytics
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <a
                  href={`/api/repos/${slug}/export?type=report`}
                  data-testid="cta-report"
                >
                  <Download className="h-4 w-4" />
                  Markdown report
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/" data-testid="cta-another">
                  Analyze another
                </Link>
              </Button>
            </div>
          </div>
        )}

        <p className="sr-only">{scene.a11y}</p>
      </div>

      {/* Footer nav — fixed chrome; native buttons for reliable event binding */}
      <div className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md sm:px-6">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white hover:bg-white/10 disabled:opacity-40"
          onClick={prev}
          disabled={index === 0}
          aria-label="Previous scene"
          data-testid="wrapped-prev"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="text-center text-[11px] text-white/45">
          ← → keys · swipe · {Math.round(progress)}%
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-white/90 px-4 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-40"
          onClick={next}
          disabled={index >= scenes.length - 1}
          aria-label="Next scene"
          data-testid="wrapped-next"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CountUp({
  value,
  reduceMotion,
}: {
  value: string | number;
  reduceMotion: boolean;
}) {
  const numeric = typeof value === "number" ? value : Number(value);
  const isNum =
    Number.isFinite(numeric) &&
    String(value).trim() !== "" &&
    !String(value).includes(":") &&
    typeof value === "number";

  // Animate only pure numeric heroes; strings render immediately.
  const [frame, setFrame] = useState(0);
  const targetRef = useRef(isNum ? numeric : 0);

  useEffect(() => {
    if (!isNum || reduceMotion) return;
    targetRef.current = numeric;
    let raf = 0;
    const start = performance.now();
    const target = numeric;
    const duration = Math.min(1400, 400 + Math.log10(Math.max(1, target)) * 300);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setFrame(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, isNum, numeric, reduceMotion]);

  if (!isNum) return <>{value}</>;
  if (reduceMotion) return <>{numeric.toLocaleString()}</>;
  return <>{frame.toLocaleString()}</>;
}
