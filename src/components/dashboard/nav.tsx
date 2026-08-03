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
  Tag,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
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
      className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
    >
      {items.map((item) => {
        const href = item.href ? `${base}/${item.href}` : base;
        const active =
          item.href === ""
            ? pathname === base || pathname === `${base}/`
            : pathname?.startsWith(href);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/15 font-medium text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
