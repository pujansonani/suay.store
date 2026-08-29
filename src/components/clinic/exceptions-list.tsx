"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";

export interface ExceptionRow {
  id: string;
  dateKey: string;
  type: string;
  startMinute: number | null;
  endMinute: number | null;
  reason: string | null;
  staffName: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  CLOSED: "Closed all day",
  MODIFIED_HOURS: "Different hours",
  TIME_OFF: "Blocked period",
};

export function ExceptionsList({ exceptions }: { exceptions: ExceptionRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function remove(id: string) {
    setPendingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/clinic/schedule/exceptions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json();
        setError(body?.error?.message ?? "We could not remove this.");
        return;
      }
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[0.9375rem] font-semibold text-navy-600">Upcoming changes</h2>
        <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
          Holidays, short days and practitioner leave. Add these from the calendar.
        </p>
      </div>

      {error && (
        <div className="px-5 pt-4">
          <FormError>{error}</FormError>
        </div>
      )}

      {exceptions.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No upcoming changes"
          description="Your weekly hours apply for now. Use Block time on the calendar to add a closure or leave."
          className="py-10"
        />
      ) : (
        <ul className="divide-y divide-line">
          {exceptions.map((exception) => (
            <li key={exception.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-28 shrink-0 text-[0.8125rem] font-medium text-navy-600 tabular">
                {exception.dateKey}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={exception.type === "CLOSED" ? "danger" : "warning"}>
                    {TYPE_LABEL[exception.type] ?? exception.type}
                  </Badge>
                  {exception.startMinute !== null && exception.endMinute !== null && (
                    <span className="text-[0.8125rem] text-ink tabular">
                      {label(exception.startMinute)}–{label(exception.endMinute)}
                    </span>
                  )}
                  {exception.staffName && (
                    <span className="text-[0.8125rem] text-ink-muted">{exception.staffName}</span>
                  )}
                </div>
                {exception.reason && (
                  <p className="mt-0.5 text-[0.75rem] text-ink-muted">{exception.reason}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                loading={pendingId === exception.id}
                onClick={() => void remove(exception.id)}
                aria-label={`Remove change on ${exception.dateKey}`}
              >
                <Trash2 aria-hidden className="size-3.5 text-danger" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function label(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
