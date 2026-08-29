"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A horizontal strip of dates rather than a full month grid: appointments are
 * usually booked within a fortnight, and a strip is far easier to operate on
 * a phone. Arrow keys move between dates, as they would in a calendar.
 */
export function DatePicker({
  value,
  onChange,
  days = 14,
  minDate,
}: {
  value: string;
  onChange: (date: string) => void;
  days?: number;
  minDate?: string;
}) {
  const [offset, setOffset] = React.useState(0);
  const start = minDate ?? todayKey();
  const visible = 7;

  const dates = React.useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(start, i)),
    [start, days],
  );

  const window = dates.slice(offset, offset + visible);
  const canGoBack = offset > 0;
  const canGoForward = offset + visible < dates.length;

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = dates.indexOf(value);
    if (index < 0) return;
    if (event.key === "ArrowRight" && index < dates.length - 1) {
      event.preventDefault();
      const next = dates[index + 1]!;
      onChange(next);
      if (index + 1 >= offset + visible) setOffset((o) => Math.min(o + 1, dates.length - visible));
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      const previous = dates[index - 1]!;
      onChange(previous);
      if (index - 1 < offset) setOffset((o) => Math.max(o - 1, 0));
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.75rem] font-medium text-navy-600">Select a date</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(o - visible, 0))}
            disabled={!canGoBack}
            aria-label="Show earlier dates"
            className="inline-flex size-7 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:bg-surface-muted disabled:opacity-40"
          >
            <ChevronLeft aria-hidden className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(o + visible, dates.length - visible))}
            disabled={!canGoForward}
            aria-label="Show later dates"
            className="inline-flex size-7 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:bg-surface-muted disabled:opacity-40"
          >
            <ChevronRight aria-hidden className="size-3.5" />
          </button>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Appointment date"
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-1.5"
      >
        {window.map((date) => {
          const selected = date === value;
          const [, month, day] = date.split("-");
          return (
            <button
              key={date}
              type="button"
              role="radio"
              aria-checked={selected}
              // Only the selected date is in the tab order; arrows move within.
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(date)}
              className={cn(
                "flex flex-col items-center rounded-md border px-1 py-2 transition-colors",
                selected
                  ? "border-teal-500 bg-teal-500 text-white"
                  : "border-line bg-surface text-ink hover:border-teal-200 hover:bg-teal-50/50",
              )}
            >
              <span
                className={cn(
                  "text-[0.625rem] uppercase tracking-wide",
                  selected ? "text-teal-100" : "text-ink-subtle",
                )}
              >
                {weekdayLabel(date)}
              </span>
              <span className="text-[0.9375rem] font-semibold tabular">{day}</span>
              <span
                className={cn("text-[0.625rem]", selected ? "text-teal-100" : "text-ink-subtle")}
              >
                {monthLabel(month!)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthLabel(month: string): string {
  return MONTHS[Number(month) - 1] ?? "";
}

function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]!;
}

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y!, m! - 1, d! + days));
  return next.toISOString().slice(0, 10);
}
