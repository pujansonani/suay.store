"use client";

import * as React from "react";
import Link from "next/link";

import { Select } from "@/components/ui/field";
import { SlotGridSkeleton, EmptyState, LoadingAnnouncer } from "@/components/ui/states";
import { DatePicker } from "@/components/booking/date-picker";
import type { DayAvailability } from "@/lib/booking/availability";

/**
 * Read-only availability on the clinic profile. It shows real free times
 * before anyone commits to the booking flow, so the first thing a patient
 * learns is whether this clinic can see them at all.
 */
export function ClinicAvailabilityPreview({
  providerId,
  services,
}: {
  providerId: string;
  services: { id: string; name: string; durationMinutes: number }[];
}) {
  const [serviceId, setServiceId] = React.useState(services[0]?.id ?? "");
  const [date, setDate] = React.useState(() => todayInBangkok());
  const [days, setDays] = React.useState<DayAvailability[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ serviceId, from: date });
    fetch(`/api/clinics/${providerId}/availability?${params}`)
      .then(async (response) => {
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(body?.error?.message ?? "We could not load availability.");
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
  }, [providerId, serviceId, date]);

  const day = days?.[0];

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line p-4">
        <label className="block">
          <span className="mb-1.5 block text-[0.75rem] font-medium text-navy-600">Treatment</span>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.durationMinutes} min
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="border-b border-line p-4">
        <DatePicker value={date} onChange={setDate} days={14} />
      </div>

      <div className="p-4">
        {loading && (
          <>
            <LoadingAnnouncer label="Loading available times" />
            <SlotGridSkeleton />
          </>
        )}

        {!loading && error && (
          <p role="alert" className="text-[0.8125rem] text-danger">
            {error}
          </p>
        )}

        {!loading && !error && day && day.slots.length === 0 && (
          <EmptyState
            title={day.isOpen ? "No available times on this date" : "The clinic is closed on this date"}
            description={
              day.isOpen
                ? "Every practitioner or treatment room is already booked. Try another date."
                : day.closedReason ?? undefined
            }
            className="py-8"
          />
        )}

        {!loading && !error && day && day.slots.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {day.slots.slice(0, 15).map((slot) => (
                <Link
                  key={slot.startAt}
                  href={`/booking/${serviceId}?date=${day.date}&time=${encodeURIComponent(slot.startAt)}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-surface text-[0.8125rem] font-medium text-navy-600 tabular transition-colors hover:border-teal-300 hover:bg-teal-50"
                >
                  {slot.label}
                </Link>
              ))}
            </div>
            {day.slots.length > 15 && (
              <p className="mt-3 text-[0.75rem] text-ink-muted">
                {day.slots.length - 15} more times available on this date.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function todayInBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
