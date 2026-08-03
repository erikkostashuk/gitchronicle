import { cn } from "@/lib/utils";

/**
 * Dashboard section. A ruled heading plus content — no nested card chrome,
 * so pages read as an editorial layout instead of a grid of boxes.
 */
export function Section({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-2.5">
        <h2 className="text-[0.95rem] font-extrabold tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {action}
      </div>
      <div className={cn("pt-4", contentClassName)}>{children}</div>
    </section>
  );
}
