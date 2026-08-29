"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { AnimatePresence, FadeIn } from "@/components/ui/motion";

export interface ClinicProfileValues {
  name: string;
  legalName: string;
  specialty: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  lineId: string;
  addressLine1: string;
  district: string;
  city: string;
  postalCode: string;
  cancellationPolicy: string;
  bookingPolicy: string;
  cancellationWindowHours: string;
}

export function ClinicProfileForm({ defaults }: { defaults: ClinicProfileValues }) {
  const router = useRouter();
  const [values, setValues] = React.useState(defaults);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  function set<K extends keyof ClinicProfileValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    setFieldErrors({});

    try {
      const response = await fetch("/api/clinic/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          cancellationWindowHours: values.cancellationWindowHours
            ? Number(values.cancellationWindowHours)
            : null,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not save your changes.");
        if (body?.error?.details) setFieldErrors(body.error.details);
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Clinic name" error={fieldErrors.name} required>
          {(props) => <Input {...props} value={values.name} onChange={(e) => set("name", e.target.value)} required />}
        </Field>
        <Field label="Registered legal name" optional>
          {(props) => (
            <Input {...props} value={values.legalName} onChange={(e) => set("legalName", e.target.value)} />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Speciality" hint="Shown under your clinic name." optional>
          {(props) => (
            <Input
              {...props}
              value={values.specialty}
              onChange={(e) => set("specialty", e.target.value)}
              placeholder="Skin & Aesthetic Care"
            />
          )}
        </Field>
        <Field label="Tagline" optional>
          {(props) => (
            <Input {...props} value={values.tagline} onChange={(e) => set("tagline", e.target.value)} />
          )}
        </Field>
      </div>

      <Field
        label="About your clinic"
        hint="What you do and how you work. Avoid claims about guaranteed results."
        error={fieldErrors.description}
      >
        {(props) => (
          <Textarea
            {...props}
            rows={5}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
        )}
      </Field>

      <fieldset className="space-y-4">
        <legend className="text-[0.8125rem] font-semibold text-navy-600">Contact</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" error={fieldErrors.email} optional>
            {(props) => (
              <Input {...props} type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
            )}
          </Field>
          <Field label="Phone" error={fieldErrors.phone} optional>
            {(props) => (
              <Input {...props} type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
            )}
          </Field>
          <Field label="Website" optional>
            {(props) => (
              <Input {...props} value={values.website} onChange={(e) => set("website", e.target.value)} />
            )}
          </Field>
          <Field label="LINE ID" optional>
            {(props) => <Input {...props} value={values.lineId} onChange={(e) => set("lineId", e.target.value)} />}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-[0.8125rem] font-semibold text-navy-600">Address</legend>
        <Field label="Street address" optional>
          {(props) => (
            <Input
              {...props}
              value={values.addressLine1}
              onChange={(e) => set("addressLine1", e.target.value)}
            />
          )}
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="District" optional>
            {(props) => (
              <Input {...props} value={values.district} onChange={(e) => set("district", e.target.value)} />
            )}
          </Field>
          <Field label="City" optional>
            {(props) => <Input {...props} value={values.city} onChange={(e) => set("city", e.target.value)} />}
          </Field>
          <Field label="Postal code" optional>
            {(props) => (
              <Input {...props} value={values.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-[0.8125rem] font-semibold text-navy-600">Policies</legend>
        <p className="text-[0.75rem] text-ink-muted">
          Shown to patients before they confirm a booking, and again on their appointment.
        </p>

        <Field
          label="Free cancellation window (hours)"
          hint="How long before an appointment a patient can cancel without a fee."
          optional
        >
          {(props) => (
            <Input
              {...props}
              type="number"
              min={0}
              max={168}
              value={values.cancellationWindowHours}
              onChange={(e) => set("cancellationWindowHours", e.target.value)}
              className="max-w-32"
              placeholder="24"
            />
          )}
        </Field>

        <Field label="Cancellation policy" hint="Explain your fees in plain language.">
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              value={values.cancellationPolicy}
              onChange={(e) => set("cancellationPolicy", e.target.value)}
            />
          )}
        </Field>

        <Field label="Before your appointment" hint="Arrival, consultation and what to bring.">
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              value={values.bookingPolicy}
              onChange={(e) => set("bookingPolicy", e.target.value)}
            />
          )}
        </Field>
      </fieldset>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
        <AnimatePresence>
          {saved && (
            <FadeIn className="flex items-center gap-1.5 text-[0.8125rem] text-success">
              <Check aria-hidden className="size-3.5" />
              <span role="status">Saved</span>
            </FadeIn>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
