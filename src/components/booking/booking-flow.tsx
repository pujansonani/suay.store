"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, CreditCard, Info, MapPin, QrCode, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { EmptyState, SlotGridSkeleton, LoadingAnnouncer } from "@/components/ui/states";
import { StepTransition, SuccessCheck } from "@/components/ui/motion";
import { BookingSteps } from "@/components/booking/steps";
import { DatePicker } from "@/components/booking/date-picker";
import { HoldTimer } from "@/components/booking/hold-timer";
import type { AvailableSlot, DayAvailability } from "@/lib/booking/availability";
import { cn } from "@/lib/utils";

export interface BookingService {
  id: string;
  name: string;
  durationMinutes: number;
  priceMinor: number;
  currency: string;
  isMedicalAesthetic: boolean;
  importantInfo: string | null;
  cancellationPolicy: string | null;
  provider: { id: string; name: string; slug: string; district: string | null; city: string };
  practitioners: { id: string; name: string; role: string }[];
}

export interface BookingViewer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

type Stage = "time" | "details" | "payment" | "done";

const STEP_LABELS = ["Date & time", "Your details", "Payment", "Confirmation"];
const STAGE_INDEX: Record<Stage, number> = { time: 0, details: 1, payment: 2, done: 3 };

interface HeldBooking {
  id: string;
  reference: string;
  holdExpiresAt: string | null;
  priceMinor: number;
  currency: string;
}

export function BookingFlow({
  service,
  viewer,
  formatPrice,
  initialDate,
  initialStartAt,
}: {
  service: BookingService;
  viewer: BookingViewer | null;
  formatPrice: string;
  initialDate: string;
  initialStartAt?: string;
}) {
  const router = useRouter();

  const [stage, setStage] = React.useState<Stage>("time");
  const [direction, setDirection] = React.useState<1 | -1>(1);

  const [staffId, setStaffId] = React.useState<string>("");
  const [date, setDate] = React.useState(initialDate);
  const [slot, setSlot] = React.useState<AvailableSlot | null>(null);

  const [days, setDays] = React.useState<DayAvailability[] | null>(null);
  const [loadingSlots, setLoadingSlots] = React.useState(true);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);

  const [booking, setBooking] = React.useState<HeldBooking | null>(null);
  const [method, setMethod] = React.useState<"CARD" | "PROMPTPAY">("CARD");
  const [simulate, setSimulate] = React.useState<"success" | "decline">("success");
  const [qrPayload, setQrPayload] = React.useState<string | null>(null);
  const [paymentId, setPaymentId] = React.useState<string | null>(null);

  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);

  const [details, setDetails] = React.useState({
    name: viewer?.name ?? "",
    email: viewer?.email ?? "",
    phone: viewer?.phone ?? "",
    note: "",
  });

  function goTo(next: Stage) {
    setDirection(STAGE_INDEX[next] >= STAGE_INDEX[stage] ? 1 : -1);
    setStage(next);
    setError(null);
  }

  // --- Availability --------------------------------------------------------
  React.useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setSlotsError(null);

    const params = new URLSearchParams({ serviceId: service.id, from: date });
    if (staffId) params.set("staffId", staffId);

    fetch(`/api/clinics/${service.provider.id}/availability?${params}`)
      .then(async (response) => {
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setSlotsError(body?.error?.message ?? "We could not load available times.");
          setDays(null);
          return;
        }
        setDays(body.days);

        // Honour a time passed in from the clinic profile, once.
        if (initialStartAt && !slot) {
          const match = (body.days as DayAvailability[])[0]?.slots.find(
            (s) => s.startAt === initialStartAt,
          );
          if (match) setSlot(match);
        }
      })
      .catch(() => {
        if (!cancelled) setSlotsError("We could not reach the server. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
    // `slot` is intentionally excluded: re-running on selection would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.id, service.provider.id, date, staffId, initialStartAt]);

  const day = days?.[0];

  // --- Actions -------------------------------------------------------------
  async function createHold() {
    if (!slot) return;
    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: service.provider.id,
          serviceId: service.id,
          startAt: slot.startAt,
          staffId: staffId || slot.staffId,
          customerName: details.name,
          customerEmail: details.email,
          customerPhone: details.phone,
          customerNote: details.note,
          landingPath: `/clinics/${service.provider.slug}`,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body?.error?.message ?? "We could not hold this appointment.");
        if (body?.error?.details) setFieldErrors(body.error.details);
        // The slot went while the form was open — send them back to pick again.
        if (body?.error?.code === "SLOT_UNAVAILABLE") {
          setSlot(null);
          setDays(null);
          goTo("time");
          setDate((d) => d);
        }
        setPending(false);
        return;
      }

      setBooking(body.booking);
      goTo("payment");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function pay() {
    if (!booking) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, method, simulate }),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body?.error?.message ?? "The payment could not be completed.");
        setPending(false);
        return;
      }

      setPaymentId(body.paymentId);

      if (body.failureMessage) {
        setError(body.failureMessage);
        setPending(false);
        return;
      }

      if (body.completed) {
        goTo("done");
        router.refresh();
        return;
      }

      // PromptPay: show the QR and wait for the gateway webhook.
      setQrPayload(body.qrPayload ?? null);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function simulatePromptPay() {
    if (!paymentId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/payments/${paymentId}/simulate`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "The simulated payment could not be applied.");
        setPending(false);
        return;
      }
      goTo("done");
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  // --- Render --------------------------------------------------------------
  const summary = (
    <aside className="rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24">
      <h2 className="text-[0.9375rem] font-semibold text-navy-600">Booking summary</h2>

      <dl className="mt-4 space-y-3 text-[0.8125rem]">
        <div>
          <dt className="text-ink-subtle">Treatment</dt>
          <dd className="mt-0.5 font-medium text-ink">{service.name}</dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Clinic</dt>
          <dd className="mt-0.5 text-ink">
            <Link href={`/clinics/${service.provider.slug}`} className="hover:text-teal-600">
              {service.provider.name}
            </Link>
          </dd>
          <dd className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
            <MapPin aria-hidden className="size-3" />
            {service.provider.district
              ? `${service.provider.district}, ${service.provider.city}`
              : service.provider.city}
          </dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Duration</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-ink">
            <Clock aria-hidden className="size-3.5 text-ink-subtle" />
            {service.durationMinutes} minutes
          </dd>
        </div>
        {slot && (
          <div>
            <dt className="text-ink-subtle">Appointment</dt>
            <dd className="mt-0.5 font-medium text-ink tabular">
              {formatDateLabel(date)} · {slot.label}
            </dd>
            {slot.staffName && (
              <dd className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
                <User aria-hidden className="size-3" />
                {staffId
                  ? service.practitioners.find((p) => p.id === staffId)?.name
                  : `${slot.staffName} (assigned)`}
              </dd>
            )}
          </div>
        )}
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-[0.8125rem] text-ink-muted">Total</span>
        <span className="text-lg font-semibold text-navy-600 tabular">{formatPrice}</span>
      </div>

      {service.cancellationPolicy && (
        <p className="mt-3 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
          <span className="font-medium text-ink">Cancellation:</span> {service.cancellationPolicy}
        </p>
      )}
    </aside>
  );

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <Link
          href={`/clinics/${service.provider.slug}`}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-teal-600"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Back to {service.provider.name}
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-navy-600 md:text-2xl">Book an appointment</h1>
        <div className="mt-4">
          <BookingSteps steps={STEP_LABELS} current={STAGE_INDEX[stage]} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <StepTransition stepKey={stage} direction={direction}>
            {stage === "time" && (
              <section className="space-y-6" aria-labelledby="step-time">
                <h2 id="step-time" className="sr-only">
                  Choose a date and time
                </h2>

                {service.practitioners.length > 0 && (
                  <div className="rounded-lg border border-line bg-surface p-4">
                    <h3 className="text-[0.8125rem] font-medium text-navy-600">Practitioner</h3>
                    <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                      Choose someone specific, or let the clinic assign whoever is available.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStaffId("");
                          setSlot(null);
                        }}
                        aria-pressed={staffId === ""}
                        className={chip(staffId === "")}
                      >
                        Any available practitioner
                      </button>
                      {service.practitioners.map((practitioner) => (
                        <button
                          key={practitioner.id}
                          type="button"
                          onClick={() => {
                            setStaffId(practitioner.id);
                            setSlot(null);
                          }}
                          aria-pressed={staffId === practitioner.id}
                          className={chip(staffId === practitioner.id)}
                        >
                          {practitioner.name}
                          <span className="ml-1.5 text-[0.6875rem] opacity-70">{practitioner.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-line bg-surface p-4">
                  <DatePicker
                    value={date}
                    onChange={(next) => {
                      setDate(next);
                      setSlot(null);
                    }}
                    days={28}
                  />

                  <div className="mt-5 border-t border-line pt-4">
                    <h3 className="mb-3 text-[0.8125rem] font-medium text-navy-600">Available times</h3>

                    {loadingSlots && (
                      <>
                        <LoadingAnnouncer label="Loading available times" />
                        <SlotGridSkeleton />
                      </>
                    )}

                    {!loadingSlots && slotsError && <FormError>{slotsError}</FormError>}

                    {!loadingSlots && !slotsError && day && day.slots.length === 0 && (
                      <EmptyState
                        title={
                          day.isOpen
                            ? "No available times on this date"
                            : "The clinic is closed on this date"
                        }
                        description={
                          day.isOpen
                            ? "Every practitioner or treatment room is already taken. Try another date, or choose a different practitioner."
                            : day.closedReason ?? undefined
                        }
                        className="py-10"
                      />
                    )}

                    {!loadingSlots && !slotsError && day && day.slots.length > 0 && (
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

                {service.importantInfo && (
                  <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface-muted/60 p-3.5">
                    <Info aria-hidden className="mt-px size-4 shrink-0 text-ink-muted" />
                    <div>
                      <p className="text-[0.75rem] font-medium text-navy-600">Before you book</p>
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                        {service.importantInfo}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button size="lg" disabled={!slot} onClick={() => goTo("details")}>
                    Continue
                  </Button>
                </div>
              </section>
            )}

            {stage === "details" && (
              <section className="space-y-5" aria-labelledby="step-details">
                <h2 id="step-details" className="text-lg font-semibold text-navy-600">
                  Your details
                </h2>

                {!viewer ? (
                  <div className="rounded-lg border border-line bg-surface p-6 text-center">
                    <p className="text-[0.875rem] font-medium text-navy-600">
                      Sign in to complete your booking
                    </p>
                    <p className="mx-auto mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-ink-muted">
                      Your appointment details, cancellation options and receipts are kept in your
                      account. Your time slot is not held until you sign in.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                      <Link
                        href={`/login?next=${encodeURIComponent(bookingPath(service.id, date, slot))}`}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-teal-500 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                      >
                        Sign in
                      </Link>
                      <Link
                        href={`/register?next=${encodeURIComponent(bookingPath(service.id, date, slot))}`}
                        className="inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-surface px-5 text-sm font-medium text-navy-600 transition-colors hover:bg-surface-muted"
                      >
                        Create account
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form
                    className="space-y-4 rounded-lg border border-line bg-surface p-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void createHold();
                    }}
                    noValidate
                  >
                    {error && <FormError>{error}</FormError>}

                    <Field label="Full name" error={fieldErrors.customerName} required>
                      {(props) => (
                        <Input
                          {...props}
                          value={details.name}
                          onChange={(e) => setDetails({ ...details, name: e.target.value })}
                          autoComplete="name"
                          required
                        />
                      )}
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Email" error={fieldErrors.customerEmail} required>
                        {(props) => (
                          <Input
                            {...props}
                            type="email"
                            value={details.email}
                            onChange={(e) => setDetails({ ...details, email: e.target.value })}
                            autoComplete="email"
                            required
                          />
                        )}
                      </Field>

                      <Field
                        label="Phone number"
                        hint="The clinic uses this if they need to reach you."
                        error={fieldErrors.customerPhone}
                        required
                      >
                        {(props) => (
                          <Input
                            {...props}
                            type="tel"
                            value={details.phone}
                            onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                            autoComplete="tel"
                            placeholder="+66 81 234 5678"
                            required
                          />
                        )}
                      </Field>
                    </div>

                    <Field
                      label="Anything the clinic should know?"
                      hint="Allergies, accessibility needs, or a question for the practitioner."
                      optional
                    >
                      {(props) => (
                        <Textarea
                          {...props}
                          value={details.note}
                          onChange={(e) => setDetails({ ...details, note: e.target.value })}
                          rows={3}
                          placeholder="Optional"
                        />
                      )}
                    </Field>

                    <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                      <Button type="button" variant="ghost" onClick={() => goTo("time")}>
                        Back
                      </Button>
                      <Button type="submit" size="lg" loading={pending}>
                        Hold this time and continue
                      </Button>
                    </div>
                  </form>
                )}
              </section>
            )}

            {stage === "payment" && booking && (
              <section className="space-y-5" aria-labelledby="step-payment">
                <h2 id="step-payment" className="text-lg font-semibold text-navy-600">
                  Payment
                </h2>

                {booking.holdExpiresAt && (
                  <HoldTimer
                    expiresAt={booking.holdExpiresAt}
                    onExpired={() => {
                      setError(
                        "Your reservation expired before payment was completed. Please choose a time again.",
                      );
                    }}
                  />
                )}

                <div className="flex items-start gap-2.5 rounded-md border border-[#e8d7b9] bg-warning-bg p-3.5">
                  <Info aria-hidden className="mt-px size-4 shrink-0 text-warning" />
                  <p className="text-[0.8125rem] leading-relaxed text-warning">
                    <span className="font-medium">Demo payment — no real money will be charged.</span>{" "}
                    This environment uses a simulated gateway. No card details are collected or stored.
                  </p>
                </div>

                {error && <FormError>{error}</FormError>}

                <div className="rounded-lg border border-line bg-surface p-5">
                  <fieldset>
                    <legend className="text-[0.8125rem] font-medium text-navy-600">
                      Payment method
                    </legend>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {(
                        [
                          { value: "CARD", label: "Card", icon: CreditCard, note: "Simulated authorisation and capture" },
                          { value: "PROMPTPAY", label: "PromptPay", icon: QrCode, note: "Simulated QR and webhook" },
                        ] as const
                      ).map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-md border p-3 transition-colors",
                            method === option.value
                              ? "border-teal-400 bg-teal-50/50"
                              : "border-line bg-surface hover:bg-surface-muted",
                          )}
                        >
                          <input
                            type="radio"
                            name="method"
                            value={option.value}
                            checked={method === option.value}
                            onChange={() => {
                              setMethod(option.value);
                              setQrPayload(null);
                            }}
                            className="mt-0.5 size-4 accent-teal-500"
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink">
                              <option.icon aria-hidden className="size-3.5 text-ink-muted" />
                              {option.label}
                            </span>
                            <span className="mt-0.5 block text-[0.6875rem] text-ink-muted">
                              {option.note}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {method === "CARD" && !qrPayload && (
                    <fieldset className="mt-5 border-t border-line pt-4">
                      <legend className="sr-only">Simulated card outcome</legend>
                      <p className="text-[0.8125rem] font-medium text-navy-600">Simulated outcome</p>
                      <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                        Choose how the mock gateway should respond, so both paths can be demonstrated.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSimulate("success")}
                          aria-pressed={simulate === "success"}
                          className={chip(simulate === "success")}
                        >
                          Successful payment
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulate("decline")}
                          aria-pressed={simulate === "decline"}
                          className={chip(simulate === "decline")}
                        >
                          Declined card
                        </button>
                      </div>
                    </fieldset>
                  )}

                  {qrPayload && (
                    <div className="mt-5 border-t border-line pt-5 text-center">
                      <p className="text-[0.8125rem] font-medium text-navy-600">
                        Scan this QR code with your banking app
                      </p>
                      <div className="mx-auto mt-3 w-fit rounded-md border border-line bg-white p-3">
                        <QrPlaceholder payload={qrPayload} />
                      </div>
                      <p className="mt-2 text-[0.6875rem] text-ink-subtle">
                        Demonstration QR code. It is not a valid PromptPay payload and cannot move money.
                      </p>
                      <div className="mt-4">
                        <Button variant="secondary" loading={pending} onClick={() => void simulatePromptPay()}>
                          Simulate payment received
                        </Button>
                        <p className="mt-1.5 text-[0.6875rem] text-ink-subtle">
                          This sends a signed webhook through the real webhook handler.
                        </p>
                      </div>
                    </div>
                  )}

                  {!qrPayload && (
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                      <span className="text-[0.75rem] text-ink-muted">
                        Reference {booking.reference}
                      </span>
                      <Button size="lg" loading={pending} onClick={() => void pay()}>
                        {method === "PROMPTPAY" ? "Show PromptPay QR" : `Pay ${formatPrice}`}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {stage === "done" && booking && (
              <section className="rounded-lg border border-line bg-surface p-8 text-center" aria-labelledby="step-done">
                <div className="flex justify-center">
                  <SuccessCheck />
                </div>
                <h2 id="step-done" className="mt-4 text-lg font-semibold text-navy-600">
                  Your appointment is confirmed
                </h2>
                <p className="mx-auto mt-2 max-w-md text-[0.875rem] leading-relaxed text-ink-muted">
                  We have sent the details to {details.email}. {service.provider.name} has been
                  notified and your time is reserved.
                </p>

                <dl className="mx-auto mt-6 max-w-sm space-y-2.5 rounded-md border border-line bg-canvas/60 p-4 text-left text-[0.8125rem]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Booking reference</dt>
                    <dd className="font-semibold text-navy-600 tabular">{booking.reference}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Treatment</dt>
                    <dd className="text-right text-ink">{service.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">When</dt>
                    <dd className="text-right text-ink tabular">
                      {formatDateLabel(date)} · {slot?.label}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Clinic</dt>
                    <dd className="text-right text-ink">{service.provider.name}</dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  <Link
                    href="/account/appointments"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-teal-500 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                  >
                    View my appointments
                  </Link>
                  <Link
                    href="/clinics"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-surface px-5 text-sm font-medium text-navy-600 transition-colors hover:bg-surface-muted"
                  >
                    Browse more clinics
                  </Link>
                </div>
              </section>
            )}
          </StepTransition>
        </div>

        {stage !== "done" && <div>{summary}</div>}
      </div>
    </div>
  );
}

function chip(active: boolean): string {
  return cn(
    "inline-flex items-center rounded-md border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
    active
      ? "border-teal-500 bg-teal-50 text-teal-700"
      : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-navy-600",
  );
}

function bookingPath(serviceId: string, date: string, slot: AvailableSlot | null): string {
  const params = new URLSearchParams({ date });
  if (slot) params.set("time", slot.startAt);
  return `/booking/${serviceId}?${params}`;
}

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y!, m! - 1, d!)));
}

/**
 * Renders the demo payload as a QR-like grid. It is deterministic from the
 * payload but deliberately not a scannable code — this is a mock payment.
 */
function QrPlaceholder({ payload }: { payload: string }) {
  const cells = React.useMemo(() => {
    const size = 21;
    const out: boolean[] = [];
    let hash = 2166136261;
    for (let i = 0; i < payload.length; i += 1) {
      hash ^= payload.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    for (let i = 0; i < size * size; i += 1) {
      hash ^= hash << 13;
      hash ^= hash >>> 17;
      hash ^= hash << 5;
      out.push((hash & 1) === 1);
    }
    return out;
  }, [payload]);

  return (
    <div
      role="img"
      aria-label="Demonstration QR code"
      className="grid gap-px"
      style={{ gridTemplateColumns: "repeat(21, 6px)" }}
    >
      {cells.map((filled, i) => (
        <span key={i} className={filled ? "size-1.5 bg-navy-700" : "size-1.5 bg-white"} />
      ))}
    </div>
  );
}
