"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Clock,
  FileWarning,
  GitBranch,
  Home,
  Network,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "wrapped", label: "Wrapped", icon: Sparkles },
  { href: "", label: "Overview", icon: Home },
  { href: "timemachine", label: "Time Machine", icon: Clock },
  { href: "hotspots", label: "Hotspots", icon: FileWarning },
  { href: "people", label: "People", icon: Users },
  { href: "evolution", label: "Evolution", icon: GitBranch },
  { href: "graphs", label: "Graphs", icon: Network },
  { href: "releases", label: "Releases", icon: Tag },
  { href: "story", label: "Story", icon: BookOpen },
];

export function DashboardNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/repo/${slug}`;

  return (
    <nav
      aria-label="Dashboard sections"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 md:pb-0"
    >
      {items.map((item) => {
        const href = item.href ? `${base}/${item.href}` : base;
        const active =
          item.href === ""
            ? pathname === base || pathname === `${base}/`
            : pathname === href || pathname === `${href}/`;
        const Icon = item.icon;
        const isWrapped = item.href === "wrapped";
        return (
          <Link
            key={item.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-bold tracking-tight transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground",
              isWrapped &&
                !active &&
                "text-[var(--coral-deep)] dark:text-[var(--coral)]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
