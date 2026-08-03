"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  FastForward,
} from "lucide-react";
import type { TimelineSample } from "@/lib/types/analysis";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const SPEEDS = [0.5, 1, 2, 4];

export function TimeMachinePlayer({
  samples,
  contributors,
}: {
  samples: TimelineSample[];
  contributors: { id: string; name: string }[];
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [filterAuthor, setFilterAuthor] = useState<string>("all");
  const [filterPath, setFilterPath] = useState("");

  const filterKey = `${filterAuthor}::${filterPath}`;
  const filtered = useMemo(() => {
    return samples.filter((s) => {
      if (filterAuthor !== "all" && s.author !== filterAuthor && !s.activeContributors.includes(filterAuthor)) {
        // author field is display name; also match loosely
        if (!s.author.toLowerCase().includes(filterAuthor.toLowerCase())) {
          return false;
        }
      }
      if (filterPath) {
        const q = filterPath.toLowerCase();
        if (!s.tree.some((t) => t.path.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [samples, filterAuthor, filterPath]);

  // Reset scrubber when filters change without an effect (derive via key).
  const [indexState, setIndexState] = useState({ key: filterKey, index: 0 });
  if (indexState.key !== filterKey) {
    setIndexState({ key: filterKey, index: 0 });
  }
  const index = indexState.index;
  const setIndex = (updater: number | ((i: number) => number)) => {
    setIndexState((prev) => {
      const next =
        typeof updater === "function" ? updater(prev.index) : updater;
      return { key: filterKey, index: next };
    });
  };

  const safeIndex = Math.min(index, Math.max(0, filtered.length - 1));
  const current = filtered[safeIndex];

  useEffect(() => {
    if (!playing || filtered.length === 0) return;
    const ms = 800 / speed;
    const id = setInterval(() => {
      setIndex((i) => {
        if (i >= filtered.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, ms);
    return () => clearInterval(id);
    // setIndex is stable enough for playback; filter length drives bounds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, filtered.length, filterKey]);

  if (!samples.length) {
    return <p className="text-sm text-muted-foreground">No timeline samples.</p>;
  }

  if (!current) {
    return <p className="text-sm text-muted-foreground">No samples match filters.</p>;
  }

  const authorOptions = [
    ...new Set(samples.map((s) => s.author)),
  ].slice(0, 40);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <label className="text-xs text-muted-foreground">
            Contributor
            <select
              className="mt-1 block h-10 rounded-full border border-input bg-card px-3 text-sm"
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
            >
              <option value="all">All</option>
              {authorOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Path contains
            <input
              className="gc-mono mt-1 block h-10 w-48 rounded-full border border-input bg-card px-4 text-sm"
              value={filterPath}
              onChange={(e) => setFilterPath(e.target.value)}
              placeholder="src/"
            />
          </label>
        </div>
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={speed === s ? "default" : "outline"}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{current.date.slice(0, 10)}</Badge>
            <Badge variant="outline" className="font-mono">
              {current.hash.slice(0, 7)}
            </Badge>
            <span className="text-sm text-muted-foreground">{current.author}</span>
          </div>
          <CardTitle className="text-base font-medium leading-snug">
            {current.subject}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Created" value={current.filesCreated} />
            <Metric label="Modified" value={current.filesModified} />
            <Metric label="Deleted" value={current.filesDeleted} />
            <Metric label="Files total" value={current.cumulativeFiles} />
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Repository tree (sampled)
            </div>
            <div className="grid max-h-56 grid-cols-1 gap-1 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs sm:grid-cols-2">
              {current.tree.map((t) => (
                <div
                  key={`${t.kind}-${t.path}`}
                  className="flex items-center gap-2 truncate"
                >
                  <span className="text-[var(--coral-deep)] dark:text-[var(--coral)]">{t.kind === "dir" ? "▸" : "·"}</span>
                  <span className="truncate">{t.path}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label="First"
              onClick={() => setIndex(0)}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Step back"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <SkipBack className="h-4 w-4 opacity-60" />
            </Button>
            <Button
              size="icon"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Step forward"
              onClick={() =>
                setIndex((i) => Math.min(filtered.length - 1, i + 1))
              }
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Last"
              onClick={() => setIndex(filtered.length - 1)}
            >
              <FastForward className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1 px-2">
              <Slider
                value={[safeIndex]}
                min={0}
                max={Math.max(0, filtered.length - 1)}
                step={1}
                onValueChange={(v) => {
                  setPlaying(false);
                  setIndex(v[0] ?? 0);
                }}
                aria-label="Scrub timeline"
              />
            </div>
            <span className="tabular-nums text-xs text-muted-foreground">
              {safeIndex + 1}/{filtered.length}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Cumulative commits: {current.cumulativeCommits}. Active contributors
            in window: {current.activeContributors.length}.
            {contributors.length > 0 ? ` ${contributors.length} total known.` : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
