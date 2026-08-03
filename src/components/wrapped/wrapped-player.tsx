"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Pause,
  Play,
} from "lucide-react";
import type { WrappedStory } from "@/lib/wrapped";
import { cn } from "@/lib/utils";
import { sceneTheme, sceneTransition } from "./scene-theme";
import { SceneStage } from "./scene-stage";

/** Film pacing — ~5.8s per scene (readable without feeling stalled) */
const SCENE_MS = 5800;

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
  const touchY = useRef(0);

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
    touchY.current = e.changedTouches[0]?.clientY ?? 0;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const x = e.changedTouches[0]?.clientX ?? 0;
    const y = e.changedTouches[0]?.clientY ?? 0;
    const dx = x - touchX.current;
    const dy = y - touchY.current;
    // Ignore mostly-vertical gestures so scrollable scenes still scroll
    if (Math.abs(dx) < 44 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) userNext();
    else userPrev();
  };

  const onStageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [role='tab'], [data-no-tap-nav]")) {
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    if (rel < 0.22) userPrev();
    else if (rel > 0.78) userNext();
    else setAutoplay((a) => !a);
  };

  if (!scene) {
    return (
      <p className="p-8 text-muted-foreground">No Wrapped scenes available.</p>
    );
  }

  const theme = sceneTheme(scene.palette);
  const isClosing = scene.type === "closing";
  const dwell = isClosing || reduceMotion ? 0 : SCENE_MS;
  const enter = reduceMotion ? "" : sceneTransition(scene.type, index, dir);
  const isDark = theme.mode === "dark";

  return (
    <div
      className="fixed inset-0 z-50 flex h-dvh max-h-dvh w-screen flex-col overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="GitChronicle Wrapped story"
      data-testid="wrapped-player"
      data-autoplay={autoplay ? "on" : "off"}
      data-scene-mode={theme.mode}
      tabIndex={-1}
      style={{ color: theme.ink }}
    >
      {/* Surface + ambient motion */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-700"
        style={{ background: theme.surface }}
      />
      {/* Soft ambient fields. Painted as radial gradients rather than blurred
          boxes: a 90px+ blur on a viewport-sized layer is expensive on mobile
          and mis-composites at small widths. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -left-[20%] top-[-24%] h-[80vh] w-[80vh]",
          !reduceMotion && "gc-drift-a"
        )}
        style={{
          background: `radial-gradient(closest-side, ${theme.ambient}, transparent 72%)`,
        }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-[-28%] right-[-18%] h-[86vh] w-[86vh]",
          !reduceMotion && "gc-drift-b"
        )}
        style={{
          background: `radial-gradient(closest-side, ${theme.ambient}, transparent 72%)`,
        }}
      />
      {/* Geometric field marks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-[6%] hidden w-px lg:block"
        style={{ background: theme.rule }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[6%] hidden w-px lg:block"
        style={{ background: theme.rule }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${
            isDark ? "rgba(255,255,255,0.14)" : "rgba(22,19,15,0.13)"
          } 0.6px, transparent 0)`,
          backgroundSize: "5px 5px",
        }}
      />

      {/* Scene progress */}
      <div
        className="relative z-10 flex shrink-0 gap-1 px-3 pt-3 sm:px-6"
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
            className="relative z-20 h-5 flex-1 rounded-sm"
          >
            <span
              className="block h-[3px] w-full overflow-hidden rounded-full"
              style={{ background: theme.rule }}
            >
              {i < index ? (
                <span
                  className="block h-full w-full rounded-full"
                  style={{ background: theme.ink }}
                />
              ) : i > index ? (
                <span className="block h-full w-0" />
              ) : autoplay && !reduceMotion && dwell > 0 ? (
                <span
                  key={`fill-${progressKey}`}
                  className="gc-progress-fill block h-full w-full rounded-full"
                  style={{
                    animationDuration: `${dwell}ms`,
                    background: theme.ink,
                  }}
                />
              ) : (
                <span
                  className="block h-full w-full rounded-full"
                  style={{ background: theme.ink }}
                />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Masthead */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-3 py-2 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="gc-eyebrow text-[0.6rem] sm:text-[0.66rem]">
            Wrapped
          </span>
          <span
            className="text-[11px] font-bold tabular-nums"
            style={{ color: theme.inkSoft }}
            data-testid="wrapped-counter"
          >
            {index + 1}/{scenes.length}
          </span>
          <span
            className="min-w-0 truncate text-[11px] font-medium"
            style={{ color: theme.inkSoft }}
          >
            · {story.repositoryName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="gc-press inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition-colors"
            style={{ background: theme.inset, color: theme.ink }}
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
          <Link
            href={`/repo/${slug}`}
            className="gc-press inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition-colors"
            style={{ background: theme.inset, color: theme.ink }}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stats</span>
          </Link>
        </div>
      </div>

      {/* Stage */}
      <div
        key={`${scene.id}-${progressKey}`}
        className={cn(
          "relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-5 pb-3 pt-1 sm:px-10 lg:px-14",
          // The closing beat is the only scene that may exceed one screen
          isClosing && "overflow-y-auto",
          enter
        )}
        aria-live="polite"
        data-testid="wrapped-scene-body"
        data-scene-type={scene.type}
        onClick={onStageClick}
      >
        <SceneStage
          scene={scene}
          theme={theme}
          reduceMotion={reduceMotion}
          slug={slug}
          story={story}
        />
        <p className="sr-only">{scene.a11y}</p>
      </div>

      {/* Transport */}
      <div
        className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-t px-3 py-2.5 sm:px-6"
        style={{
          borderColor: theme.rule,
          background: isDark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.42)",
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          type="button"
          className="gc-press inline-flex h-10 items-center gap-1 rounded-full px-4 text-xs font-bold transition-opacity disabled:opacity-35"
          style={{ color: theme.ink }}
          onClick={userPrev}
          disabled={index === 0}
          aria-label="Previous scene"
          data-testid="wrapped-prev"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <p
          className="hidden text-[11px] font-medium sm:block"
          style={{ color: theme.inkSoft }}
        >
          {autoplay && !isClosing && !reduceMotion
            ? "Autoplaying · tap the edges to skip · centre pauses"
            : "← → to move · P to play/pause"}
        </p>
        <button
          type="button"
          className="gc-press inline-flex h-10 items-center gap-1 rounded-full px-5 text-xs font-bold transition-opacity disabled:opacity-35"
          style={{ background: theme.ink, color: theme.mode === "dark" ? "#16130f" : "#fbf7f1" }}
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
