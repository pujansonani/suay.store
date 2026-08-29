"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";

export function PublishToggle({
  published,
  approved,
}: {
  published: boolean;
  approved: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/clinic/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not change this.");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <FormError>{error}</FormError>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.8125rem] font-medium text-navy-600">
            {published ? "Listed on the marketplace" : "Not listed"}
          </p>
          <p className="mt-0.5 text-[0.75rem] text-ink-muted">
            {published
              ? "Patients can find and book your clinic."
              : approved
                ? "Your clinic is approved but hidden. Publish when you are ready to take bookings."
                : "You can publish once Suay has approved your clinic."}
          </p>
        </div>

        <Button
          variant={published ? "secondary" : "primary"}
          loading={pending}
          disabled={!approved && !published}
          onClick={() => void toggle()}
        >
          {published ? (
            <>
              <EyeOff aria-hidden className="size-3.5" />
              Unpublish
            </>
          ) : (
            <>
              <Eye aria-hidden className="size-3.5" />
              Publish clinic
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
