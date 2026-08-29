"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/field";
import { AnimatePresence, FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

interface Period {
  startMinute: number;
  endMinute: number;
}

const DAYS = [
  { index: 1, label: "Monday" },
  { index: 2, label: "Tuesday" },
  { index: 3, label: "Wednesday" },
  { index: 4, label: "Thursday" },
  { index: 5, label: "Friday" },
  { index: 6, label: "Saturday" },
  { index: 0, label: "Sunday" },
];

/**
 * Weekly opening hours.
 *
 * Multiple periods per day are supported directly, because split shifts
 * (10:00–14:00 and 16:00–21:00) are normal for Thai clinics and a single
 * open/close pair cannot express them.
 */
export function HoursEditor({
  initialRules,
}: {
  initialRules: { dayOfWeek: number; startMinute: number; endMinute: number; staffId: string | null }[];
}) {
  const router = useRouter();

  const [week, setWeek] = React.useState<Record<number, Period[]>>(() => {
    const map: Record<number, Period[]> = {};
    for (const day of DAYS) map[day.index] = [];
    for (const rule of initialRules) {
      // Clinic-wide hours only; per-practitioner shifts are edited on the
      // calendar as exceptions.
      if (rule.staffId) continue;
      map[rule.dayOfWeek] = [
        ...(map[rule.dayOfWeek] ?? []),
        { startMinute: rule.startMinute, endMinute: rule.endMinute },
      ];
    }
    return map;
  });

  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function setPeriod(day: number, index: number, patch: Partial<Period>) {
    setWeek((current) => {
      const periods = [...(current[day] ?? [])];
      periods[index] = { ...periods[index]!, ...patch };
      return { ...current, [day]: periods };
    });
  }

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);

    const rules = DAYS.flatMap((day) =>
      (week[day.index] ?? []).map((period) => ({
        dayOfWeek: day.index,
        startMinute: period.startMinute,
        endMinute: period.endMinute,
        staffId: null,
      })),
    );

    const invalid = rules.find((r) => r.endMinute <= r.startMinute);
    if (invalid) {
      setError("Each period must end after it starts. Check the highlighted day.");
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/clinic/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not save your opening hours.");
        setPending(false);
        return;
      }
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[0.9375rem] font-semibold text-navy-600">Weekly opening hours</h2>
        <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
          Add more than one period for a split shift. Times are in your clinic's local time.
        </p>
      </div>

      <div className="divide-y divide-line">
        {DAYS.map((day) => {
          const periods = week[day.index] ?? [];
          const closed = periods.length === 0;

          return (
            <div key={day.index} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-start">
              <div className="w-32 shrink-0 pt-1.5">
                <p className="text-[0.8125rem] font-medium text-navy-600">{day.label}</p>
                {closed && <p className="text-[0.75rem] text-ink-subtle">Closed</p>}
              </div>

              <div className="flex-1 space-y-2">
                {periods.map((period, index) => {
                  const invalid = period.endMinute <= period.startMinute;
                  return (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`start-${day.index}-${index}`}>
                        {day.label} period {index + 1} start
                      </label>
                      <Input
                        id={`start-${day.index}-${index}`}
                        type="time"
                        value={toLabel(period.startMinute)}
                        aria-invalid={invalid || undefined}
                        onChange={(e) =>
                          setPeriod(day.index, index, { startMinute: toMinutes(e.target.value) })
                        }
                        className={cn("h-9 w-32 text-[0.8125rem]", invalid && "border-danger")}
                      />
                      <span aria-hidden className="text-[0.8125rem] text-ink-subtle">to</span>
                      <label className="sr-only" htmlFor={`end-${day.index}-${index}`}>
                        {day.label} period {index + 1} end
                      </label>
                      <Input
                        id={`end-${day.index}-${index}`}
                        type="time"
                        value={toLabel(period.endMinute)}
                        aria-invalid={invalid || undefined}
                        onChange={(e) =>
                          setPeriod(day.index, index, { endMinute: toMinutes(e.target.value) })
                        }
                        className={cn("h-9 w-32 text-[0.8125rem]", invalid && "border-danger")}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${day.label} period ${index + 1}`}
                        onClick={() =>
                          setWeek((current) => ({
                            ...current,
                            [day.index]: (current[day.index] ?? []).filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 aria-hidden className="size-3.5 text-danger" />
                      </Button>
                    </div>
                  );
                })}

                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0 text-ink-muted"
                  onClick={() =>
                    setWeek((current) => ({
                      ...current,
                      [day.index]: [
                        ...(current[day.index] ?? []),
                        { startMinute: 10 * 60, endMinute: 19 * 60 },
                      ],
                    }))
                  }
                >
                  <Plus aria-hidden className="size-3.5" />
                  {closed ? "Open this day" : "Add another period"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-line bg-canvas/60 px-5 py-3.5">
        <Button loading={pending} onClick={() => void save()}>
          Save opening hours
        </Button>
        <AnimatePresence>
          {saved && (
            <FadeIn className="flex items-center gap-1.5 text-[0.8125rem] text-success">
              <Check aria-hidden className="size-3.5" />
              <span role="status">Saved</span>
            </FadeIn>
          )}
        </AnimatePresence>
        {error && (
          <div className="flex-1">
            <FormError>{error}</FormError>
          </div>
        )}
      </div>
    </div>
  );
}

function toLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function toMinutes(label: string): number {
  const [h, m] = label.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
