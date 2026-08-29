"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Progress through the booking. Current position is exposed with
 * `aria-current` and a text label, not by colour alone.
 */
export function BookingSteps({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <nav aria-label="Booking progress">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={step} className="flex items-center gap-1">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.75rem] font-medium transition-colors",
                  active && "bg-teal-50 text-teal-700",
                  done && "text-ink-muted",
                  !active && !done && "text-ink-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold",
                    active && "bg-teal-500 text-white",
                    done && "bg-success text-white",
                    !active && !done && "border border-line-strong text-ink-subtle",
                  )}
                >
                  {done ? <Check aria-hidden className="size-2.5" /> : index + 1}
                </span>
                {step}
                {active && <span className="sr-only">(current step)</span>}
              </span>
              {index < steps.length - 1 && (
                <span aria-hidden className="h-px w-4 bg-line" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
