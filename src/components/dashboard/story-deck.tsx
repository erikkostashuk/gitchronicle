"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import type { StorySlide } from "@/lib/types/analysis";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

export function StoryDeck({ slides }: { slides: StorySlide[] }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const slide = slides[index];

  const next = useCallback(() => {
    setIndex((i) => Math.min(slides.length - 1, i + 1));
  }, [slides.length]);
  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (!slide) {
    return <p className="text-sm text-muted-foreground">No story slides.</p>;
  }

  return (
    <div
      className={cn(
        "space-y-4",
        fullscreen &&
          "fixed inset-0 z-50 flex flex-col bg-background p-6 sm:p-12"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{slide.kind}</Badge>
          <span className="text-xs text-muted-foreground">
            {slide.date.slice(0, 10)} · {index + 1}/{slides.length}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFullscreen((f) => !f)}
        >
          {fullscreen ? (
            <>
              <Minimize2 className="h-4 w-4" /> Exit
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4" /> Fullscreen
            </>
          )}
        </Button>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col justify-center rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-12",
          fullscreen && "min-h-0"
        )}
      >
        <h2
          className={cn(
            "font-semibold tracking-tight",
            fullscreen ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"
          )}
        >
          {slide.title}
        </h2>
        <p
          className={cn(
            "mt-4 max-w-3xl leading-relaxed text-muted-foreground",
            fullscreen ? "text-lg sm:text-xl" : "text-base"
          )}
        >
          {slide.body}
        </p>
        {slide.metrics && (
          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(slide.metrics).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {k}
                </dt>
                <dd className="text-xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={prev} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <div className="flex gap-1">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 w-4 rounded-full transition-colors",
                i === index ? "bg-primary" : "bg-muted hover:bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
        <Button onClick={next} disabled={index >= slides.length - 1}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
