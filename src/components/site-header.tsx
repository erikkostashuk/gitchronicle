import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[86rem] items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-[0.95rem] font-extrabold tracking-tight"
        >
          <span
            aria-hidden
            className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-foreground"
          >
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-[var(--coral)]" />
          </span>
          <span>
            GitChronicle
            <span className="ml-1.5 hidden text-[var(--coral-deep)] sm:inline dark:text-[var(--coral)]">
              Wrapped
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {right}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/demo">Open demo</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
