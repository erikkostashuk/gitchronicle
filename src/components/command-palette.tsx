"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Clock,
  FileWarning,
  GitBranch,
  GitGraph,
  Home,
  Network,
  Tag,
  Users,
  BookOpen,
} from "lucide-react";

const sections = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "timemachine", label: "Time Machine", icon: Clock },
  { id: "hotspots", label: "Hotspots", icon: FileWarning },
  { id: "people", label: "People", icon: Users },
  { id: "evolution", label: "Evolution", icon: GitBranch },
  { id: "graphs", label: "Graphs", icon: Network },
  { id: "releases", label: "Releases", icon: Tag },
  { id: "story", label: "Story", icon: BookOpen },
];

export function CommandPalette({
  slug,
  projects,
}: {
  slug?: string;
  projects: { slug: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <Command
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          placeholder="Jump to section or repository…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <Command.List className="max-h-80 overflow-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results.
          </Command.Empty>
          {slug && (
            <Command.Group heading="Sections" className="text-xs text-muted-foreground">
              {sections.map((s) => (
                <Command.Item
                  key={s.id}
                  value={s.label}
                  onSelect={() => {
                    router.push(`/repo/${slug}/${s.id === "overview" ? "" : s.id}`.replace(/\/$/, "") || `/repo/${slug}`);
                    if (s.id === "overview") router.push(`/repo/${slug}`);
                    else router.push(`/repo/${slug}/${s.id}`);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
                >
                  <s.icon className="h-4 w-4 text-primary" />
                  {s.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Repositories" className="mt-2 text-xs text-muted-foreground">
            {projects.map((p) => (
              <Command.Item
                key={p.slug}
                value={p.name}
                onSelect={() => {
                  router.push(`/repo/${p.slug}`);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
              >
                <GitGraph className="h-4 w-4 text-primary" />
                {p.name}
              </Command.Item>
            ))}
            <Command.Item
              value="Home"
              onSelect={() => {
                router.push("/");
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
            >
              <Home className="h-4 w-4 text-primary" />
              Home
            </Command.Item>
          </Command.Group>
        </Command.List>
        <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          Press <kbd className="rounded border border-border px-1">⌘K</kbd> to toggle
        </div>
      </Command>
    </div>
  );
}
