import type { LanguageSeries } from "@/lib/types/analysis";

const HUES = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

/** Proportional language field: one stacked bar plus a keyed list. */
export function LanguageBars({ languages }: { languages: LanguageSeries[] }) {
  const total = languages.reduce((s, l) => s + l.count, 0);
  if (languages.length === 0 || total === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-center">
        <p className="text-sm font-bold">No language signal.</p>
        <p className="text-xs text-muted-foreground">
          No tracked file extensions were recognised.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={languages
          .map((l) => `${l.language} ${Math.round((l.count / total) * 100)}%`)
          .join(", ")}
      >
        {languages.map((l, i) => (
          <span
            key={l.language}
            className="transition-[filter] duration-200 hover:brightness-110"
            style={{
              flex: `${l.count} 1 0%`,
              background: HUES[i % HUES.length],
            }}
            title={`${l.language} · ${Math.round((l.count / total) * 100)}%`}
          />
        ))}
      </div>
      <ul className="mt-4 divide-y">
        {languages.map((l, i) => (
          <li
            key={l.language}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: HUES[i % HUES.length] }}
              />
              <span className="truncate text-sm font-semibold">
                {l.language}
              </span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {Math.round((l.count / total) * 100)}%
              <span className="ml-2 text-xs opacity-70">{l.count}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
