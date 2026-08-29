import * as React from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The numeric value is always present in the text, so the stars are decorative
 * and hidden from assistive technology.
 */
export function Rating({
  value,
  count,
  size = "sm",
  className,
  showCount = true,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
  showCount?: boolean;
}) {
  if (!count) {
    return <span className={cn("text-[0.8125rem] text-ink-subtle", className)}>No reviews yet</span>;
  }

  const starSize = size === "md" ? "size-4" : "size-3.5";
  const rounded = Math.round(value);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden className="inline-flex items-center gap-px">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              starSize,
              i <= rounded ? "fill-warning text-warning" : "fill-transparent text-line-strong",
            )}
            strokeWidth={1.5}
          />
        ))}
      </span>
      <span className={cn("font-medium text-ink tabular", size === "md" ? "text-sm" : "text-[0.8125rem]")}>
        {value.toFixed(1)}
      </span>
      {showCount && (
        <span className="text-[0.8125rem] text-ink-muted">
          ({count} {count === 1 ? "review" : "reviews"})
        </span>
      )}
    </span>
  );
}
