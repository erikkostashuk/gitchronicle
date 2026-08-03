import { cn, formatNumber } from "@/lib/utils";
import { Tooltip, TooltipProvider } from "../ui/tooltip";
import { Info } from "lucide-react";

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {hint && (
          <TooltipProvider>
            <Tooltip content={hint}>
              <button type="button" className="text-muted-foreground/80" aria-label={`About ${label}`}>
                <Info className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
    </div>
  );
}
