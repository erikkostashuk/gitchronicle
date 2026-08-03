"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

export function RepoSwitcher({
  projects,
  currentSlug,
}: {
  projects: {
    slug: string;
    name: string;
    status: string;
    isDemo: boolean;
  }[];
  currentSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const current = projects.find((p) => p.slug === currentSlug);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 max-w-[220px] items-center gap-2 rounded-md border border-border bg-card px-3 text-sm shadow-sm hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate font-medium">
          {current?.name ?? "Repositories"}
        </span>
        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl"
          >
            {projects.map((p) => (
              <li key={p.slug}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                    p.slug === currentSlug && "bg-accent"
                  )}
                  onClick={() => {
                    setOpen(false);
                    const section =
                      pathname?.split("/").slice(3).join("/") || "";
                    router.push(
                      section
                        ? `/repo/${p.slug}/${section}`
                        : `/repo/${p.slug}`
                    );
                  }}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="flex items-center gap-1">
                    {p.isDemo && <Badge variant="secondary">Demo</Badge>}
                    {p.status !== "ready" && (
                      <Badge variant="warning">{p.status}</Badge>
                    )}
                  </span>
                </button>
              </li>
            ))}
            <li>
              <Link
                href="/"
                className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                + Import repository
              </Link>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
