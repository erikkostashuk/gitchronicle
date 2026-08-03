import Link from "next/link";
import { GitBranch } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function SiteHeader({
  right,
}: {
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <GitBranch className="h-4 w-4" />
          </span>
          <span>
            Git<span className="text-primary">Chronicle</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {right}
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/demo">Open demo</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
