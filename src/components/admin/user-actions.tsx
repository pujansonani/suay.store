"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FormError, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

export function UserActions({
  userId,
  email,
  status,
  isSelf,
}: {
  userId: string;
  email: string;
  status: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const suspending = status === "ACTIVE";

  // An administrator cannot lock themselves out; the API refuses this too.
  if (isSelf) {
    return <span className="text-[0.75rem] text-ink-subtle">You</span>;
  }

  async function run() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: suspending ? "suspend" : "reinstate", reason }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not update this account.");
        setPending(false);
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant={suspending ? "danger" : "secondary"}
        size="sm"
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
      >
        {suspending ? "Suspend" : "Reinstate"}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={suspending ? "Suspend this account?" : "Reinstate this account?"}
        description={email}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant={suspending ? "danger" : "primary"}
              loading={pending}
              onClick={() => void run()}
            >
              {suspending ? "Suspend account" : "Reinstate account"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <FormError>{error}</FormError>}
          <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
            {suspending
              ? "The account will be signed out on its next request and cannot sign back in. Their bookings and history are preserved."
              : "The account will be able to sign in again."}
          </p>
          <Field label="Reason" hint="Recorded in the audit log." optional>
            {(props) => (
              <Textarea
                {...props}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-autofocus
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}
