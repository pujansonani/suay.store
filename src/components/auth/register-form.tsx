"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

export function CustomerRegisterForm() {
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
          phone: String(data.get("phone") ?? ""),
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body?.error?.message ?? "We could not create your account.");
        if (body?.error?.details) setFieldErrors(body.error.details);
        setPending(false);
        return;
      }

      router.push(body.redirectTo);
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <FormError>{error}</FormError>}

      <Field label="Full name" error={fieldErrors.name} required>
        {(props) => <Input {...props} name="name" autoComplete="name" required />}
      </Field>

      <Field label="Email" error={fieldErrors.email} required>
        {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
      </Field>

      <Field
        label="Phone number"
        hint="Clinics use this to reach you about your appointment."
        error={fieldErrors.phone}
        optional
      >
        {(props) => <Input {...props} name="phone" type="tel" autoComplete="tel" placeholder="+66 81 234 5678" />}
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
        Create account
      </Button>
    </form>
  );
}
