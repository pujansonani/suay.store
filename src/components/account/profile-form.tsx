"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { AnimatePresence, FadeIn } from "@/components/ui/motion";

export function ProfileForm({
  defaults,
}: {
  defaults: { name: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [values, setValues] = React.useState(defaults);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    setFieldErrors({});

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <FormError>{error}</FormError>}

      <Field label="Full name" error={fieldErrors.name} required>
        {(props) => (
          <Input
            {...props}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            autoComplete="name"
            required
          />
        )}
      </Field>

      <Field label="Email" error={fieldErrors.email} required>
        {(props) => (
          <Input
            {...props}
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            autoComplete="email"
            required
          />
        )}
      </Field>

      <Field label="Phone number" error={fieldErrors.phone} optional>
        {(props) => (
          <Input
            {...props}
            type="tel"
            value={values.phone}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
            autoComplete="tel"
            placeholder="+66 81 234 5678"
          />
        )}
      </Field>

      <div className="flex items-center gap-3 pt-1">
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
