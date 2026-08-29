"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { EmptyState, SlotGridSkeleton, LoadingAnnouncer, ErrorState } from "@/components/ui/states";
import { DatePicker } from "@/components/booking/date-picker";
import type { AvailableSlot, DayAvailability } from "@/lib/booking/availability";
import { cn } from "@/lib/utils";

export function RescheduleFlow({
  booking,
  initialDate,
  blockedReason,
}: {
  booking: {
    id: string;
    reference: string;
    startAt: string;
    serviceId: string;
    serviceName: string;
    durationMinutes: number;
    providerId: string;
    providerName: string;
    providerSlug: string;
    cancellationPolicy: string | null;
  };
  initialDate: string;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [date, setDate] = React.useState(initialDate);
  const [slot, setSlot] = React.useState<AvailableSlot | null>(null);
  const [days, setDays] = React.useState<DayAvailability[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (blockedReason) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ serviceId: booking.serviceId, from: date });
    fetch(`/api/clinics/${booking.providerId}/availability?${params}`)
      .then(async (response) => {
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(body?.error?.message ?? "We could not load available times.");
          setDays(null);
        } else {
          setDays(body.days);
        }
      })
      .catch(() => {
        if (!cancelled) setError("We could not reach the server. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [booking.providerId, booking.serviceId, date, blockedReason]);

  async function submit() {
    if (!slot) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: slot.startAt, staffId: slot.staffId }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not move this appointment.");
        // Someone took the slot in the meantime — reload what is free now.
        if (body?.error?.code === "SLOT_UNAVAILABLE") {
          setSlot(null);
          setDate((d) => d);
        }
        setPending(false);
        return;
      }
      router.push("/account/appointments");
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
      setPending(false);
    }
  }

  const day = days?.[0];

  return (
    <div className="max-w-2xl">
      <Link
        href="/account/appointments"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-teal-600"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Back to my appointments
      </Link>

      <h2 className="mt-3 text-lg font-semibold text-navy-600">Reschedule appointment</h2>
      <p className="mt-1 text-[0.8125rem] text-ink-muted">
        {booking.serviceName} at {booking.providerName} · {booking.reference}
      </p>

      {blockedReason ? (
        <div className="mt-6 rounded-lg border border-line bg-surface">
          <ErrorState
            variant="warning"
            title="This appointment cannot be rescheduled"
            description={blockedReason}
            action={
              <Link
                href="/account/appointments"
                className="inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-3.5 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted"
              >
                Back to my appointments
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-start gap-2.5 rounded-md border border-line bg-surface-muted/60 p-3.5">
            <Info aria-hidden className="mt-px size-4 shrink-0 text-ink-muted" />
            <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
              Choosing a new time re-checks the practitioner, the treatment room and any equipment
              your treatment needs. Your current time is released only once the new one is confirmed.
            </p>
          </div>

          {error && (
            <div className="mt-4">
              <FormError>{error}</FormError>
            </div>
          )}

          <div className="mt-5 rounded-lg border border-line bg-surface p-4">
            <DatePicker
              value={date}
              onChange={(next) => {
                setDate(next);
                setSlot(null);
              }}
              days={28}
            />

            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-3 text-[0.8125rem] font-medium text-navy-600">New time</h3>

              {loading && (
                <>
                  <LoadingAnnouncer label="Loading available times" />
                  <SlotGridSkeleton />
                </>
              )}

              {!loading && day && day.slots.length === 0 && (
                <EmptyState
                  title={
                    day.isOpen ? "No available times on this date" : "The clinic is closed on this date"
                  }
                  description={
                    day.isOpen
                      ? "Try another date."
                      : day.closedReason ?? undefined
                  }
                  className="py-10"
                />
              )}

              {!loading && day && day.slots.length > 0 && (
                <div
                  role="radiogroup"
                  aria-label="Available times"
                  className="grid grid-cols-3 gap-2 sm:grid-cols-5"
                >
                  {day.slots.map((option) => {
                    const selected = slot?.startAt === option.startAt;
                    return (
                      <button
                        key={option.startAt}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSlot(option)}
                        className={cn(
                          "inline-flex h-10 items-center justify-center rounded-md border text-[0.8125rem] font-medium tabular transition-colors",
                          selected
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-line bg-surface text-navy-600 hover:border-teal-300 hover:bg-teal-50",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <Link
              href="/account/appointments"
              className="inline-flex h-10 items-center rounded-md px-4 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:bg-surface-muted"
            >
              Cancel
            </Link>
            <Button size="lg" disabled={!slot} loading={pending} onClick={() => void submit()}>
              Confirm new time
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
