"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

/**
 * One form for all three audiences. The server decides where the account
 * belongs — this component only reports where it was told to go, so signing
 * in on the admin page does not grant a customer admin access.
 */
export function LoginForm({
  defaultEmail = "",
  submitLabel = "Sign in",
}: {
  defaultEmail?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body?.error?.message ?? "We could not sign you in. Please try again.");
        if (body?.error?.details) setFieldErrors(body.error.details);
        setPending(false);
        return;
      }

      // `next` is honoured only for same-origin paths.
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : body.redirectTo;
      router.push(target);
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <FormError>{error}</FormError>}

      <Field label="Email" error={fieldErrors.email} required>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaultEmail}
            required
            placeholder="you@example.com"
          />
        )}
      </Field>

      <Field label="Password" error={fieldErrors.password} required>
        {(props) => (
          <Input {...props} name="password" type="password" autoComplete="current-password" required />
        )}
      </Field>

      <Button type="submit" fullWidth loading={pending} size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
