"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, MapPin, Phone, Star, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BookingStatusPill } from "@/components/ui/status";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, FormError, Textarea } from "@/components/ui/field";
import { Reveal } from "@/components/ui/motion";
import type { Locale } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface AppointmentCardBooking {
  id: string;
  reference: string;
  status: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  priceMinor: number;
  currency: string;
  serviceName: string;
  staffName: string | null;
  providerName: string;
  providerSlug: string;
  providerPhone: string | null;
  providerLocation: string;
  cancellationPolicy: string | null;
  cancellationWindowHours: number | null;
  paymentStatus: string | null;
  paymentLabel: string | null;
  hasReview: boolean;
  reviewRating: number | null;
  canCancel: boolean;
  canReschedule: boolean;
  canReview: boolean;
}

export function AppointmentCard({
  booking,
  locale,
  index = 0,
}: {
  booking: AppointmentCardBooking;
  locale: Locale;
  index?: number;
}) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<"cancel" | "review" | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");

  const hoursUntil = (new Date(booking.startAt).getTime() - Date.now()) / 3_600_000;
  const window = booking.cancellationWindowHours ?? 24;
  const lateCancellation = hoursUntil > 0 && hoursUntil < window;

  async function cancel() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not cancel this appointment.");
        setPending(false);
        return;
      }
      setDialog(null);
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function submitReview() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, rating, comment }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not submit your review.");
        setPending(false);
        return;
      }
      setDialog(null);
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Reveal index={index}>
        <article className="rounded-lg border border-line bg-surface">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[0.9375rem] font-semibold text-navy-600">{booking.serviceName}</h3>
                <BookingStatusPill status={booking.status} />
              </div>

              <p className="mt-1 text-[0.8125rem] text-ink-muted">
                <Link href={`/clinics/${booking.providerSlug}`} className="hover:text-teal-600">
                  {booking.providerName}
                </Link>
              </p>

              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[0.8125rem] sm:grid-cols-2">
                <div className="flex items-center gap-1.5">
                  <CalendarClock aria-hidden className="size-3.5 shrink-0 text-ink-subtle" />
                  <dt className="sr-only">When</dt>
                  <dd className="text-ink tabular">
                    {formatDate(booking.startAt, locale, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {formatTime(booking.startAt, locale)}–{formatTime(booking.endAt, locale)}
                  </dd>
                </div>

                {booking.staffName && (
                  <div className="flex items-center gap-1.5">
                    <User aria-hidden className="size-3.5 shrink-0 text-ink-subtle" />
                    <dt className="sr-only">Practitioner</dt>
                    <dd className="text-ink">{booking.staffName}</dd>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-3.5 shrink-0 text-ink-subtle" />
                  <dt className="sr-only">Location</dt>
                  <dd className="text-ink">{booking.providerLocation}</dd>
                </div>

                {booking.providerPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone aria-hidden className="size-3.5 shrink-0 text-ink-subtle" />
                    <dt className="sr-only">Clinic phone</dt>
                    <dd className="text-ink">{booking.providerPhone}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="shrink-0 text-left sm:text-right">
              <p className="text-[0.6875rem] text-ink-subtle">Reference</p>
              <p className="text-[0.8125rem] font-medium text-navy-600 tabular">{booking.reference}</p>
              <p className="mt-2 text-[0.9375rem] font-semibold text-navy-600 tabular">
                {formatMoney(booking.priceMinor, booking.currency, locale)}
              </p>
              {booking.paymentLabel && (
                <p className="mt-0.5 text-[0.6875rem] text-ink-subtle">{booking.paymentLabel}</p>
              )}
              {booking.hasReview && booking.reviewRating !== null && (
                <Badge tone="neutral" className="mt-2">
                  You rated {booking.reviewRating}/5
                </Badge>
              )}
            </div>
          </div>

          {(booking.canCancel || booking.canReschedule || booking.canReview) && (
            <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-canvas/60 px-5 py-3">
              {booking.canReschedule && (
                <Link
                  href={`/account/appointments/${booking.id}/reschedule`}
                  className="inline-flex h-8 items-center rounded-md border border-line-strong bg-surface px-3 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted"
                >
                  Reschedule
                </Link>
              )}
              {booking.canCancel && (
                <Button variant="danger" size="sm" onClick={() => setDialog("cancel")}>
                  Cancel appointment
                </Button>
              )}
              {booking.canReview && (
                <Button variant="secondary" size="sm" onClick={() => setDialog("review")}>
                  <Star aria-hidden className="size-3.5" />
                  Leave a review
                </Button>
              )}
              {lateCancellation && booking.canCancel && (
                <span className="text-[0.75rem] text-warning">
                  Within the clinic's {window}-hour cancellation window
                </span>
              )}
            </div>
          )}
        </article>
      </Reveal>

      <Modal
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        title="Cancel this appointment?"
        description={`${booking.serviceName} at ${booking.providerName}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={pending}>
              Keep appointment
            </Button>
            <Button variant="danger" loading={pending} onClick={() => void cancel()}>
              Cancel appointment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <FormError>{error}</FormError>}

          {booking.cancellationPolicy && (
            <div className="rounded-md border border-line bg-surface-muted/60 p-3">
              <p className="text-[0.75rem] font-medium text-navy-600">The clinic's policy</p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                {booking.cancellationPolicy}
              </p>
            </div>
          )}

          <Field label="Reason for cancelling" hint="Shared with the clinic." optional>
            {(props) => (
              <Textarea
                {...props}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                data-autofocus
              />
            )}
          </Field>
        </div>
      </Modal>

      <Modal
        open={dialog === "review"}
        onClose={() => setDialog(null)}
        title="Leave a review"
        description={`${booking.serviceName} at ${booking.providerName}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void submitReview()}>
              Publish review
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <FormError>{error}</FormError>}

          <fieldset>
            <legend className="text-[0.8125rem] font-medium text-navy-600">Your rating</legend>
            <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Rating out of 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} out of 5`}
                  onClick={() => setRating(value)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-md border transition-colors",
                    value <= rating
                      ? "border-warning/40 bg-warning-bg text-warning"
                      : "border-line bg-surface text-line-strong hover:border-line-strong",
                  )}
                >
                  <Star aria-hidden className={cn("size-4", value <= rating && "fill-warning")} />
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[0.75rem] text-ink-muted">{rating} out of 5</p>
          </fieldset>

          <Field label="Your review" hint="Published on the clinic's profile with your name." optional>
            {(props) => (
              <Textarea
                {...props}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="What was your experience like?"
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}
