import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

/**
 * A single figure with its label. No sparklines, no percentage-change badges
 * invented from a comparison that was never computed — the number and what it
 * counts, nothing more.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: "default" | "positive" | "attention";
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.75rem] font-medium text-ink-muted">{label}</p>
        {Icon && <Icon aria-hidden className="size-4 shrink-0 text-ink-subtle" />}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular",
          tone === "positive" && "text-success",
          tone === "attention" && "text-warning",
          tone === "default" && "text-navy-600",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[0.75rem] text-ink-subtle">{hint}</p>}
    </div>
  );
}
