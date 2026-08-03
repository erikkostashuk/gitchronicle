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
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import type { WrappedScene, WrappedStory } from "@/lib/wrapped";
import { ShareCardDownloader } from "./share-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Default dwell time per scene (ms) — Stories-style autoplay */
const SCENE_MS = 5200;
const CLOSING_MS = 0; // stop autoplay on closing

const PALETTES: Record<
  WrappedScene["palette"],
  { bg: string; accent: string; glow: string; shine: string }
> = {
  aurora: {
    bg: "from-[#04151a] via-[#0b1f2a] to-[#1a1040]",
    accent: "text-teal-300",
    glow: "bg-teal-400/25",
    shine: "#2dd4bf",
  },
  ember: {
    bg: "from-[#1a0a08] via-[#2a1210] to-[#1a1030]",
    accent: "text-orange-300",
    glow: "bg-orange-400/25",
    shine: "#fb923c",
  },
  midnight: {
    bg: "from-[#05070f] via-[#0a1020] to-[#101828]",
    accent: "text-sky-300",
    glow: "bg-sky-400/20",
    shine: "#7dd3fc",
  },
  forest: {
    bg: "from-[#04140f] via-[#0a1f18] to-[#0f1a28]",
    accent: "text-emerald-300",
    glow: "bg-emerald-400/25",
    shine: "#6ee7b7",
  },
  violet: {
    bg: "from-[#0c0618] via-[#1a0f30] to-[#0a1528]",
    accent: "text-violet-300",
    glow: "bg-violet-400/25",
    shine: "#c4b5fd",
  },
  slate: {
    bg: "from-[#0b0e14] via-[#141a24] to-[#1a2030]",
    accent: "text-slate-200",
    glow: "bg-slate-400/20",
    shine: "#e2e8f0",
  },
  ocean: {
    bg: "from-[#031018] via-[#0a2238] to-[#0c1830]",
    accent: "text-cyan-300",
    glow: "bg-cyan-400/25",
    shine: "#67e8f9",
  },
  gold: {
    bg: "from-[#141008] via-[#2a2010] to-[#1a1020]",
    accent: "text-amber-200",
    glow: "bg-amber-400/25",
    shine: "#fcd34d",
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
  const [reduceMotion, setReduceMotion] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [progressKey, setProgressKey] = useState(0);
  const scene = scenes[index];
  const touchX = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduceMotion(mq.matches);
      if (mq.matches) setAutoplay(false);
    };
    const id = requestAnimationFrame(apply);
    mq.addEventListener("change", apply);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener("change", apply);
    };
  }, []);

  const goTo = useCallback(
    (i: number, direction?: "forward" | "back") => {
      const nextIdx = Math.max(0, Math.min(scenes.length - 1, i));
      setDir(direction ?? (nextIdx >= index ? "forward" : "back"));
      setIndex(nextIdx);
      setProgressKey((k) => k + 1);
    },
    [scenes.length, index]
  );

  const next = useCallback(() => {
    if (index >= scenes.length - 1) return;
    setDir("forward");
    setIndex((i) => Math.min(scenes.length - 1, i + 1));
    setProgressKey((k) => k + 1);
  }, [index, scenes.length]);

  const prev = useCallback(() => {
    if (index <= 0) return;
    setDir("back");
    setIndex((i) => Math.max(0, i - 1));
    setProgressKey((k) => k + 1);
  }, [index]);

  /** User-driven nav pauses autoplay (Spotify-like control) */
  const userNext = useCallback(() => {
    setAutoplay(false);
    next();
  }, [next]);
  const userPrev = useCallback(() => {
    setAutoplay(false);
    prev();
  }, [prev]);
  const userGoTo = useCallback(
    (i: number) => {
      setAutoplay(false);
      goTo(i);
    },
    [goTo]
  );

  // Autoplay advance — effect restarts when autoplay/index changes
  useEffect(() => {
    if (!autoplay || reduceMotion) return;
    const s = scenes[index];
    if (!s || s.type === "closing") return;
    const t = window.setTimeout(() => {
      setDir("forward");
      setIndex((i) => Math.min(scenes.length - 1, i + 1));
      setProgressKey((k) => k + 1);
    }, SCENE_MS);
    return () => clearTimeout(t);
  }, [autoplay, reduceMotion, index, scenes, progressKey]);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        userNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        userPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        userGoTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        userGoTo(scenes.length - 1);
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setAutoplay((a) => !a);
      } else if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    const w = window as Window & {
      __gcWrapped?: {
        next: () => void;
        prev: () => void;
        goTo: (i: number) => void;
      };
    };
    w.__gcWrapped = { next: userNext, prev: userPrev, goTo: userGoTo };
    return () => {
      window.removeEventListener("keydown", onKey);
      delete w.__gcWrapped;
    };
  }, [userNext, userPrev, userGoTo, fullscreen, scenes.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? 0;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const x = e.changedTouches[0]?.clientX ?? 0;
    const dx = x - touchX.current;
    if (dx < -50) userNext();
    if (dx > 50) userPrev();
  };

  // Tap left/right thirds of stage (Stories UX) — ignore interactive targets
  const onStageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [role='tab'], [data-no-tap-nav]")) {
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    if (rel < 0.28) userPrev();
    else if (rel > 0.72) userNext();
    else setAutoplay((a) => !a);
  };

  if (!scene) {
    return (
      <p className="p-8 text-muted-foreground">No Wrapped scenes available.</p>
    );
  }

  const pal = PALETTES[scene.palette];
  const isClosing = scene.type === "closing";
  const dwell = isClosing || reduceMotion ? CLOSING_MS : SCENE_MS;
  const sceneAnim =
    !reduceMotion && (dir === "forward" ? "gc-scene-forward" : "gc-scene-back");

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
      data-autoplay={autoplay ? "on" : "off"}
      tabIndex={0}
      style={{ ["--shine" as string]: pal.shine }}
    >
      {/* Animated gradient background */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br transition-all duration-700",
          pal.bg
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full blur-3xl",
          pal.glow,
          !reduceMotion && "gc-orb-a"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-20 -right-16 h-[32rem] w-[32rem] rounded-full blur-3xl",
          pal.glow,
          !reduceMotion && "gc-orb-b"
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]"
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.45)_100%)]"
      />

      {/* Story progress segments */}
      <div
        className="relative z-10 flex shrink-0 gap-1 px-3 pt-3 sm:px-5 sm:pt-4"
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
            onClick={() => userGoTo(i)}
            className="relative z-20 h-5 flex-1 py-1.5"
          >
            <span className="block h-1 w-full overflow-hidden rounded-full bg-white/20">
              {i < index ? (
                <span className="block h-full w-full rounded-full bg-white" />
              ) : i > index ? (
                <span className="block h-full w-0 rounded-full bg-white" />
              ) : autoplay && !reduceMotion && dwell > 0 ? (
                <span
                  key={`fill-${progressKey}`}
                  className={cn(
                    "gc-progress-fill block h-full w-full rounded-full bg-white",
                    !autoplay && "is-paused"
                  )}
                  style={{ animationDuration: `${dwell}ms` }}
                />
              ) : (
                <span className="block h-full w-full rounded-full bg-white" />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <Sparkles className="h-3.5 w-3.5 text-teal-300" />
          <span className="font-semibold tracking-[0.18em]">WRAPPED</span>
          <span className="tabular-nums text-white/50" data-testid="wrapped-counter">
            {index + 1}/{scenes.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs text-white hover:bg-white/10"
            onClick={() => setAutoplay((a) => !a)}
            aria-label={autoplay ? "Pause autoplay" : "Play autoplay"}
            data-testid="wrapped-autoplay"
          >
            {autoplay ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {autoplay ? "Pause" : "Play"}
            </span>
          </button>
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

      {/* Scene stage — tap zones + scroll for tall content */}
      <div
        key={`${scene.id}-${progressKey}`}
        className={cn(
          "relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-12 sm:py-10 md:px-20",
          isClosing || scene.list || scene.metrics
            ? "flex flex-col justify-start"
            : "flex flex-col justify-center",
          sceneAnim
        )}
        aria-live="polite"
        data-testid="wrapped-scene-body"
        data-scene-type={scene.type}
        onClick={onStageClick}
      >
        <div className={cn("max-w-4xl", !reduceMotion && "gc-stagger")}>
          {scene.kicker && (
            <p
              className={cn(
                "mb-3 text-xs font-semibold uppercase tracking-[0.22em] sm:text-sm",
                pal.accent
              )}
            >
              {scene.kicker}
            </p>
          )}
          <h2
            className={cn(
              "text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl",
              !reduceMotion && "gc-title-shine"
            )}
          >
            {scene.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base text-white/75 sm:text-lg md:text-xl">
            {scene.subtitle}
          </p>
          {scene.body && (
            <p className="mt-2 font-mono text-sm text-white/50">{scene.body}</p>
          )}
        </div>

        {scene.hero !== undefined && (
          <div className={cn("mt-8", !reduceMotion && "gc-hero-pop")}>
            <div
              className={cn(
                "text-6xl font-bold tabular-nums tracking-tight sm:text-7xl md:text-8xl lg:text-9xl",
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
              <div className="mt-2 text-sm font-medium uppercase tracking-[0.14em] text-white/50">
                {scene.heroLabel}
              </div>
            )}
          </div>
        )}

        {scene.metrics && scene.metrics.length > 0 && (
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {scene.metrics.map((m, mi) => (
              <div
                key={m.label}
                className={cn(
                  "rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-md",
                  !reduceMotion && "gc-chip-in"
                )}
                style={
                  !reduceMotion
                    ? { animationDelay: `${0.25 + mi * 0.06}s` }
                    : undefined
                }
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
          <div className="mt-8 max-w-xl space-y-2.5" data-no-tap-nav>
            {scene.bars.slice(0, 8).map((b) => (
              <div key={b.label} className="flex items-center gap-3 text-sm">
                <span className="w-24 truncate text-white/60 sm:w-32">
                  {b.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-400",
                      !reduceMotion && "gc-bar-grow"
                    )}
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

        {scene.type === "rhythm" && scene.bars && scene.bars.length === 24 && (
          <div
            className="mt-8 flex h-28 max-w-2xl items-end gap-0.5"
            data-no-tap-nav
          >
            {scene.bars.map((b, bi) => (
              <div
                key={b.label}
                className={cn(
                  "flex-1 rounded-t-sm bg-gradient-to-t from-cyan-600/90 to-teal-300",
                  !reduceMotion && "gc-hist-rise"
                )}
                style={{
                  height: `${Math.max(4, (b.value / Math.max(1, b.max)) * 100)}%`,
                  animationDelay: !reduceMotion
                    ? `${0.2 + bi * 0.02}s`
                    : undefined,
                }}
                title={`${b.label}:00 — ${b.value}`}
              />
            ))}
          </div>
        )}

        {scene.list && scene.list.length > 0 && (
          <ul className="mt-8 max-w-xl space-y-2" data-no-tap-nav>
            {scene.list.slice(0, 8).map((item, i) => (
              <li
                key={`${item.label}-${i}`}
                className={cn(
                  "flex items-baseline justify-between gap-3 border-b border-white/10 pb-2 text-sm",
                  !reduceMotion && "gc-chip-in"
                )}
                style={
                  !reduceMotion
                    ? { animationDelay: `${0.3 + i * 0.05}s` }
                    : undefined
                }
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
          <div className="mt-6 flex flex-wrap gap-2" data-no-tap-nav>
            {scene.chips.map((c, ci) => (
              <span
                key={c}
                className={cn(
                  "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/85 backdrop-blur-sm",
                  !reduceMotion && "gc-chip-in"
                )}
                style={
                  !reduceMotion
                    ? { animationDelay: `${0.35 + ci * 0.05}s` }
                    : undefined
                }
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
            data-no-tap-nav
          >
            <ShareCardDownloader cards={story.shareCards} />
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                className="bg-teal-400 text-teal-950 hover:bg-teal-300"
              >
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

      {/* Footer */}
      <div className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md sm:px-6">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white hover:bg-white/10 disabled:opacity-40"
          onClick={userPrev}
          disabled={index === 0}
          aria-label="Previous scene"
          data-testid="wrapped-prev"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="text-center text-[11px] text-white/45">
          {autoplay && !isClosing && !reduceMotion
            ? "Autoplaying · tap center to pause · edges to skip"
            : "← → keys · swipe · P play/pause"}
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-white/90 px-4 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-40"
          onClick={userNext}
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

  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!isNum || reduceMotion) return;
    let raf = 0;
    const start = performance.now();
    const target = numeric;
    const duration = Math.min(1600, 500 + Math.log10(Math.max(1, target)) * 320);
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
