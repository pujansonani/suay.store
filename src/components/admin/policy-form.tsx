"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/field";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatePresence, FadeIn } from "@/components/ui/motion";
import type { PlatformPolicy } from "@/lib/config";

export function PolicyForm({ policy }: { policy: PlatformPolicy }) {
  const router = useRouter();
  const [values, setValues] = React.useState({
    ...policy,
    commissionPercent: String(policy.commissionBps / 100),
  });
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function num<K extends keyof PlatformPolicy>(key: K) {
    return {
      value: String(values[key]),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setValues((v) => ({ ...v, [key]: Number(e.target.value) })),
    };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionBps: Math.round(Number(values.commissionPercent) * 100),
          depositPercent: values.depositPercent,
          cancellationFreeHours: values.cancellationFreeHours,
          cancellationLateFeePercent: values.cancellationLateFeePercent,
          holdMinutes: values.holdMinutes,
          slotIntervalMinutes: values.slotIntervalMinutes,
          maxAdvanceDays: values.maxAdvanceDays,
          minNoticeMinutes: values.minNoticeMinutes,
          allowCustomerReschedule: values.allowCustomerReschedule,
          rescheduleFreeHours: values.rescheduleFreeHours,
          maxReschedulesPerBooking: values.maxReschedulesPerBooking,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not save these settings.");
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
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <FormError>{error}</FormError>}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Booking engine</CardTitle>
            <CardDescription>
              How slots are generated and how long a payment hold lasts.
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Payment hold (minutes)"
            hint="How long a slot is reserved while a patient pays. Expired holds return the slot to the calendar."
          >
            {(p) => <Input {...p} type="number" min={2} max={120} {...num("holdMinutes")} />}
          </Field>
          <Field label="Slot interval (minutes)" hint="Granularity of offered start times.">
            {(p) => <Input {...p} type="number" min={5} max={120} step={5} {...num("slotIntervalMinutes")} />}
          </Field>
          <Field label="Minimum notice (minutes)" hint="How soon before an appointment a patient may book.">
            {(p) => <Input {...p} type="number" min={0} max={10080} {...num("minNoticeMinutes")} />}
          </Field>
          <Field label="Booking window (days)" hint="How far ahead patients may book.">
            {(p) => <Input {...p} type="number" min={1} max={365} {...num("maxAdvanceDays")} />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cancellation and rescheduling</CardTitle>
            <CardDescription>
              Platform defaults. A clinic may set a shorter free-cancellation window of its own.
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Free cancellation window (hours)">
              {(p) => <Input {...p} type="number" min={0} max={168} {...num("cancellationFreeHours")} />}
            </Field>
            <Field label="Late cancellation fee (%)" hint="Surfaced to the patient; not charged in this build.">
              {(p) => <Input {...p} type="number" min={0} max={100} {...num("cancellationLateFeePercent")} />}
            </Field>
            <Field label="Free reschedule window (hours)">
              {(p) => <Input {...p} type="number" min={0} max={168} {...num("rescheduleFreeHours")} />}
            </Field>
            <Field label="Maximum reschedules per booking">
              {(p) => <Input {...p} type="number" min={0} max={10} {...num("maxReschedulesPerBooking")} />}
            </Field>
          </div>

          <Checkbox
            label="Patients may reschedule their own appointments"
            description="When off, patients must contact the clinic. Clinics can always move an appointment."
            checked={values.allowCustomerReschedule}
            onChange={(e) =>
              setValues((v) => ({ ...v, allowCustomerReschedule: e.target.checked }))
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Commercial</CardTitle>
            <CardDescription>
              Illustrative only in this build. No payout is calculated or scheduled from these values.
            </CardDescription>
          </div>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Platform commission (%)">
            {(p) => (
              <Input
                {...p}
                type="number"
                min={0}
                max={50}
                step="0.1"
                value={values.commissionPercent}
                onChange={(e) => setValues((v) => ({ ...v, commissionPercent: e.target.value }))}
              />
            )}
          </Field>
          <Field label="Deposit taken at booking (%)" hint="100 means the full price is taken up front.">
            {(p) => <Input {...p} type="number" min={0} max={100} {...num("depositPercent")} />}
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          Save settings
        </Button>
        <AnimatePresence>
          {saved && (
            <FadeIn className="flex items-center gap-1.5 text-[0.8125rem] text-success">
              <Check aria-hidden className="size-3.5" />
              <span role="status">Saved</span>
            </FadeIn>
          )}
        </AnimatePresence>
        <p className="text-[0.75rem] text-ink-subtle">Every change is recorded in the audit log.</p>
      </div>
    </form>
  );
}
