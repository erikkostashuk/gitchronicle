import { cn, formatNumber } from "@/lib/utils";
import { Tooltip, TooltipProvider } from "../ui/tooltip";
import { Info } from "lucide-react";

const ACCENTS = [
  "var(--coral)",
  "var(--cobalt)",
  "var(--teal)",
  "var(--amber)",
  "var(--plum)",
  "var(--lime-deep)",
];

/**
 * Headline metric. A ruled numeral rather than a boxed card, so a row of
 * stats reads as a masthead strip.
 */
export function Stat({
  label,
  value,
  hint,
  index = 0,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  index?: number;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div
        aria-hidden
        className="h-1 w-full rounded-full"
        style={{ background: ACCENTS[index % ACCENTS.length] }}
      />
      <div className="mt-2.5 truncate text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold leading-none tracking-tight tabular-nums">
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
      <div className="gc-eyebrow mt-2 flex items-center gap-1.5 text-[0.58rem] text-muted-foreground">
        <span className="truncate">{label}</span>
        {hint && (
          <TooltipProvider>
            <Tooltip content={hint}>
              <button
                type="button"
                className="shrink-0 text-muted-foreground/80"
                aria-label={`About ${label}`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
