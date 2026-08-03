"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutDashboard,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import type { WrappedScene, WrappedStory } from "@/lib/wrapped";
import { ShareCardDownloader } from "./share-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Fast film pacing — ~2.8s per scene */
const SCENE_MS = 2800;

const PALETTES: Record<
  WrappedScene["palette"],
  { bg: string; accent: string; glow: string; shine: string }
> = {
  aurora: {
    bg: "from-[#021a1f] via-[#0c2840] to-[#1a0a38]",
    accent: "text-teal-300",
    glow: "bg-teal-400/30",
    shine: "#2dd4bf",
  },
  ember: {
    bg: "from-[#1c0806] via-[#3a1510] to-[#1a0a28]",
    accent: "text-orange-300",
    glow: "bg-orange-400/30",
    shine: "#fb923c",
  },
  midnight: {
    bg: "from-[#04060f] via-[#0c1428] to-[#12082a]",
    accent: "text-sky-300",
    glow: "bg-sky-400/25",
    shine: "#7dd3fc",
  },
  forest: {
    bg: "from-[#03140e] via-[#0a2418] to-[#0a1828]",
    accent: "text-emerald-300",
    glow: "bg-emerald-400/30",
    shine: "#6ee7b7",
  },
  violet: {
    bg: "from-[#0e061c] via-[#1e0f38] to-[#0a1830]",
    accent: "text-violet-300",
    glow: "bg-violet-400/30",
    shine: "#c4b5fd",
  },
  slate: {
    bg: "from-[#0a0c12] via-[#141c28] to-[#181428]",
    accent: "text-slate-100",
    glow: "bg-slate-300/20",
    shine: "#e2e8f0",
  },
  ocean: {
    bg: "from-[#021018] via-[#0a2840] to-[#0c1830]",
    accent: "text-cyan-300",
    glow: "bg-cyan-400/30",
    shine: "#67e8f9",
  },
  gold: {
    bg: "from-[#181008] via-[#302010] to-[#1c1020]",
    accent: "text-amber-200",
    glow: "bg-amber-400/30",
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
  }, [userNext, userPrev, userGoTo, scenes.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? 0;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const x = e.changedTouches[0]?.clientX ?? 0;
    const dx = x - touchX.current;
    if (dx < -40) userNext();
    if (dx > 40) userPrev();
  };

  const onStageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [role='tab'], [data-no-tap-nav]")) {
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    if (rel < 0.25) userPrev();
    else if (rel > 0.75) userNext();
    else setAutoplay((a) => !a);
  };

  if (!scene) {
    return (
      <p className="p-8 text-muted-foreground">No Wrapped scenes available.</p>
    );
  }

  const pal = PALETTES[scene.palette];
  const isClosing = scene.type === "closing";
  const dwell = isClosing || reduceMotion ? 0 : SCENE_MS;
  const sceneAnim =
    !reduceMotion && (dir === "forward" ? "gc-film-in" : "gc-film-back");

  // Cap density for single-screen laptop
  const listItems = (scene.list ?? []).slice(0, 4);
  const metrics = (scene.metrics ?? []).slice(0, 6);
  const bars =
    scene.type === "rhythm" && scene.bars?.length === 24
      ? scene.bars
      : (scene.bars ?? []).slice(0, 5);
  const chips = (scene.chips ?? []).slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-50 flex h-dvh max-h-dvh w-screen flex-col overflow-hidden text-white"
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
      {/* Full-bleed cinematic bg */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br transition-all duration-500",
          pal.bg
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -left-[10%] top-[-10%] h-[55vh] w-[55vh] rounded-full blur-3xl",
          pal.glow,
          !reduceMotion && "gc-orb-a"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-[-15%] right-[-10%] h-[60vh] w-[60vh] rounded-full blur-3xl",
          pal.glow,
          !reduceMotion && "gc-orb-b"
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]"
      />
      {/* Fun floating shapes */}
      {!reduceMotion && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="gc-float-emoji absolute left-[8%] top-[22%] text-2xl opacity-40">
            ✨
          </span>
          <span className="gc-float-emoji-2 absolute right-[12%] top-[28%] text-xl opacity-35">
            🚀
          </span>
          <span className="gc-float-emoji absolute bottom-[18%] left-[15%] text-lg opacity-30">
            💫
          </span>
          <span className="gc-float-emoji-2 absolute bottom-[22%] right-[18%] text-2xl opacity-35">
            🔥
          </span>
        </div>
      )}

      {/* Thin story progress */}
      <div
        className="relative z-10 flex shrink-0 gap-0.5 px-3 pt-2.5 sm:px-4 sm:pt-3"
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
            className="relative z-20 h-4 flex-1"
          >
            <span className="block h-0.5 w-full overflow-hidden rounded-full bg-white/25 sm:h-1">
              {i < index ? (
                <span className="block h-full w-full rounded-full bg-white" />
              ) : i > index ? (
                <span className="block h-full w-0 rounded-full bg-white" />
              ) : autoplay && !reduceMotion && dwell > 0 ? (
                <span
                  key={`fill-${progressKey}`}
                  className="gc-progress-fill block h-full w-full rounded-full bg-white"
                  style={{ animationDuration: `${dwell}ms` }}
                />
              ) : (
                <span className="block h-full w-full rounded-full bg-white" />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Micro header */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 sm:px-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-white/70 sm:text-xs">
          <Sparkles className="h-3 w-3 text-teal-300" />
          WRAPPED
          <span
            className="tabular-nums font-normal tracking-normal text-white/45"
            data-testid="wrapped-counter"
          >
            {index + 1}/{scenes.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] text-white/80 hover:bg-white/10"
            onClick={() => setAutoplay((a) => !a)}
            aria-label={autoplay ? "Pause autoplay" : "Play autoplay"}
            data-testid="wrapped-autoplay"
          >
            {autoplay ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>
          <Link
            href={`/repo/${slug}`}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] text-white/80 hover:bg-white/10"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stats</span>
          </Link>
        </div>
      </div>

      {/* FILM FRAME — single screen, no scroll except closing */}
      <div
        key={`${scene.id}-${progressKey}`}
        className={cn(
          "relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col justify-center overflow-hidden px-4 pb-2 pt-1 sm:px-8 md:px-12",
          isClosing && "overflow-y-auto justify-start pt-2",
          sceneAnim
        )}
        aria-live="polite"
        data-testid="wrapped-scene-body"
        data-scene-type={scene.type}
        onClick={onStageClick}
      >
        {/* Main cinematic block — fills height */}
        <div
          className={cn(
            "grid min-h-0 flex-1 content-center gap-3 sm:gap-4",
            scene.hero !== undefined && metrics.length > 0
              ? "md:grid-cols-[1.15fr_0.85fr] md:items-center md:gap-8"
              : ""
          )}
        >
          <div className={cn("min-w-0", !reduceMotion && "gc-stagger")}>
            {scene.kicker && (
              <p
                className={cn(
                  "mb-1.5 text-[10px] font-bold uppercase tracking-[0.25em] sm:text-xs",
                  pal.accent
                )}
              >
                {scene.kicker}
              </p>
            )}
            <h2
              className={cn(
                "max-w-[18ch] text-[clamp(1.75rem,5.5vw,3.75rem)] font-bold leading-[1.05] tracking-tight",
                !reduceMotion && "gc-title-shine gc-wiggle-soft"
              )}
            >
              {scene.title}
            </h2>
            <p className="mt-2 max-w-xl text-[clamp(0.85rem,1.6vw,1.15rem)] leading-snug text-white/75">
              {scene.subtitle}
            </p>
            {scene.body && (
              <p className="mt-1 font-mono text-[11px] text-white/45 sm:text-xs">
                {scene.body}
              </p>
            )}

            {scene.hero !== undefined && (
              <div
                className={cn(
                  "mt-3 sm:mt-4",
                  !reduceMotion && "gc-hero-pop"
                )}
              >
                <div
                  className={cn(
                    "text-[clamp(2.75rem,9vw,6.5rem)] font-black tabular-nums leading-none tracking-tighter",
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
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50 sm:text-xs">
                    {scene.heroLabel}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side panel for metrics / bars when space allows */}
          <div className="min-w-0 space-y-3" data-no-tap-nav>
            {metrics.length > 0 && (
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
                {metrics.map((m, mi) => (
                  <div
                    key={m.label}
                    className={cn(
                      "rounded-xl border border-white/10 bg-white/8 px-2.5 py-2 backdrop-blur-md",
                      !reduceMotion && "gc-chip-in gc-bounce-in"
                    )}
                    style={
                      !reduceMotion
                        ? { animationDelay: `${0.12 + mi * 0.05}s` }
                        : undefined
                    }
                  >
                    <dt className="truncate text-[9px] uppercase tracking-wide text-white/45">
                      {m.label}
                    </dt>
                    <dd className="truncate text-sm font-bold tabular-nums sm:text-base">
                      {m.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {scene.type === "rhythm" && bars.length === 24 ? (
              <div className="flex h-16 items-end gap-px sm:h-20">
                {bars.map((b, bi) => (
                  <div
                    key={b.label}
                    className={cn(
                      "min-w-0 flex-1 rounded-t-sm bg-gradient-to-t from-cyan-600 to-teal-300",
                      !reduceMotion && "gc-hist-rise"
                    )}
                    style={{
                      height: `${Math.max(6, (b.value / Math.max(1, b.max)) * 100)}%`,
                      animationDelay: !reduceMotion
                        ? `${0.1 + bi * 0.015}s`
                        : undefined,
                    }}
                  />
                ))}
              </div>
            ) : (
              bars.length > 0 &&
              bars.length <= 12 && (
                <div className="space-y-1.5">
                  {bars.map((b) => (
                    <div
                      key={b.label}
                      className="flex items-center gap-2 text-[11px] sm:text-xs"
                    >
                      <span className="w-16 shrink-0 truncate text-white/55 sm:w-24">
                        {b.label}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r from-teal-400 to-fuchsia-400",
                            !reduceMotion && "gc-bar-grow"
                          )}
                          style={{
                            width: `${Math.max(4, (b.value / Math.max(1, b.max)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums text-white/70">
                        {b.value}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Bottom strip: list + chips — still in frame */}
        {(listItems.length > 0 || chips.length > 0) && (
          <div
            className="mt-2 shrink-0 space-y-2 border-t border-white/10 pt-2 sm:mt-3 sm:pt-3"
            data-no-tap-nav
          >
            {listItems.length > 0 && (
              <ul className="grid gap-1 sm:grid-cols-2">
                {listItems.map((item, i) => (
                  <li
                    key={`${item.label}-${i}`}
                    className={cn(
                      "flex items-baseline justify-between gap-2 rounded-lg bg-white/5 px-2 py-1 text-[11px] sm:text-xs",
                      !reduceMotion && "gc-chip-in"
                    )}
                    style={
                      !reduceMotion
                        ? { animationDelay: `${0.2 + i * 0.04}s` }
                        : undefined
                    }
                  >
                    <span className="truncate font-medium">{item.label}</span>
                    <span className="shrink-0 tabular-nums text-white/55">
                      {item.value}
                      {item.hint ? (
                        <span className="ml-1 text-white/35">{item.hint}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c, ci) => (
                  <span
                    key={c}
                    className={cn(
                      "rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] text-white/80 sm:text-[11px]",
                      !reduceMotion && "gc-chip-in"
                    )}
                    style={
                      !reduceMotion
                        ? { animationDelay: `${0.25 + ci * 0.04}s` }
                        : undefined
                    }
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {isClosing && (
          <div
            className="mt-3 max-h-[42vh] space-y-3 overflow-y-auto pb-2"
            data-testid="wrapped-closing"
            data-no-tap-nav
          >
            <ShareCardDownloader cards={story.shareCards} />
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                size="sm"
                className="bg-[#1ed760] text-black hover:bg-[#1fdf64]"
              >
                <Link href={`/repo/${slug}`} data-testid="cta-analytics">
                  <LayoutDashboard className="h-4 w-4" />
                  Open analytics
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
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
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/" data-testid="cta-another">
                  Another repo
                </Link>
              </Button>
            </div>
          </div>
        )}

        <p className="sr-only">{scene.a11y}</p>
      </div>

      {/* Compact film controls */}
      <div className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md sm:px-4">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-white hover:bg-white/10 disabled:opacity-40"
          onClick={userPrev}
          disabled={index === 0}
          aria-label="Previous scene"
          data-testid="wrapped-prev"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="text-center text-[10px] text-white/40 sm:text-[11px]">
          {autoplay && !isClosing && !reduceMotion
            ? "▶ autoplay · edges skip · center pauses"
            : "← → · P play/pause"}
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-white/90 disabled:opacity-40"
          onClick={userNext}
          disabled={index >= scenes.length - 1}
          aria-label="Next scene"
          data-testid="wrapped-next"
        >
          Next
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
    const duration = Math.min(900, 350 + Math.log10(Math.max(1, target)) * 200);
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
