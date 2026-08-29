"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

export function ClinicRegisterForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/clinic/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: String(data.get("clinicName") ?? ""),
          contactName: String(data.get("contactName") ?? ""),
          email: String(data.get("email") ?? ""),
          phone: String(data.get("phone") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body?.error?.message ?? "We could not create your clinic account.");
        if (body?.error?.details) setFieldErrors(body.error.details);
        setPending(false);
        return;
      }

      router.push("/clinic/onboarding");
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <FormError>{error}</FormError>}

      <Field label="Clinic name" error={fieldErrors.clinicName} required>
        {(props) => <Input {...props} name="clinicName" required placeholder="Aster Medical Clinic" />}
      </Field>

      <Field label="Your name" hint="The person managing this account." error={fieldErrors.contactName} required>
        {(props) => <Input {...props} name="contactName" autoComplete="name" required />}
      </Field>

      <Field
        label="Work email"
        hint="Used to sign in and to receive booking notifications."
        error={fieldErrors.email}
        required
      >
        {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
      </Field>

      <Field label="Clinic phone number" error={fieldErrors.phone} required>
        {(props) => (
          <Input {...props} name="phone" type="tel" autoComplete="tel" required placeholder="+66 2 000 0000" />
        )}
      </Field>

      <Field
        label="Password"
        hint="At least 8 characters, including a letter and a number."
        error={fieldErrors.password}
        required
      >
        {(props) => <Input {...props} name="password" type="password" autoComplete="new-password" required />}
      </Field>

      <Button type="submit" fullWidth loading={pending} size="lg">
        Create clinic account
      </Button>

      <p className="text-[0.75rem] leading-relaxed text-ink-subtle">
        Creating an account does not list your clinic. Nothing is visible to patients until Suay has
        reviewed your details and you have chosen to publish.
      </p>
    </form>
  );
}
