import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-foreground/25 bg-transparent text-foreground",
        success:
          "border-transparent bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]",
        warning:
          "border-transparent bg-[color-mix(in_srgb,var(--amber)_24%,transparent)] text-[#845200] dark:text-[var(--amber)]",
        danger:
          "border-transparent bg-[color-mix(in_srgb,var(--coral)_18%,transparent)] text-[var(--coral-deep)] dark:text-[#ff8a70]",
        accent: "border-transparent bg-[var(--coral)] text-[#16130f]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
