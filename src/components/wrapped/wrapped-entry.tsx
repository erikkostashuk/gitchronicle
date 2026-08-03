"use client";

import { useMemo } from "react";
import type { WrappedStory } from "@/lib/wrapped";
import { WrappedPlayer } from "./wrapped-player";

/**
 * Thin client boundary that receives a JSON string (always serializable)
 * and mounts the full-screen player.
 */
export function WrappedEntry({
  storyJson,
  slug,
}: {
  storyJson: string;
  slug: string;
}) {
  const story = useMemo(
    () => JSON.parse(storyJson) as WrappedStory,
    [storyJson]
  );
  return <WrappedPlayer story={story} slug={slug} />;
}
