"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Ban, Check, RotateCcw, ShieldOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FormError, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

type Decision = "approve" | "reject" | "request-changes" | "suspend" | "reinstate" | "deactivate";

const COPY: Record<
  Decision,
  {
    label: string;
    title: string;
    description: string;
    confirm: string;
    requiresReason: boolean;
    danger: boolean;
    hint: string;
  }
> = {
  approve: {
    label: "Approve",
    title: "Approve this clinic?",
    description: "The clinic will be able to publish itself and take bookings.",
    confirm: "Approve clinic",
    requiresReason: false,
    danger: false,
    hint: "Approving confirms you have checked the business registration and licence references. The verified badge on the public profile reflects this decision.",
  },
  reject: {
    label: "Reject",
    title: "Reject this application?",
    description: "The clinic can update its details and submit again.",
    confirm: "Reject application",
    requiresReason: true,
    danger: true,
    hint: "The reason is sent to the clinic and recorded in the audit log.",
  },
  "request-changes": {
    label: "Request changes",
    title: "Request changes",
    description: "Ask the clinic to update specific details before approval.",
    confirm: "Send request",
    requiresReason: true,
    danger: false,
    hint: "Be specific about what needs to change — this text is shown to the clinic.",
  },
  suspend: {
    label: "Suspend",
    title: "Suspend this clinic?",
    description: "It will be removed from public search and cannot take new bookings.",
    confirm: "Suspend clinic",
    requiresReason: true,
    danger: true,
    hint: "Existing bookings, payments and reviews are preserved and stay visible to administrators. Suspension can be reversed.",
  },
  reinstate: {
    label: "Reinstate",
    title: "Reinstate this clinic?",
    description: "The clinic returns to approved status and can publish again.",
    confirm: "Reinstate clinic",
    requiresReason: false,
    danger: false,
    hint: "The clinic will need to publish itself before it appears publicly again.",
  },
  deactivate: {
    label: "Deactivate",
    title: "Deactivate this clinic?",
    description: "The clinic is archived from the marketplace. Records are kept.",
    confirm: "Deactivate clinic",
    requiresReason: true,
    danger: true,
    hint: "Nothing is deleted. Bookings, payments and reviews remain available to administrators for retention and dispute purposes.",
  },
};

/**
 * Clinic lifecycle controls.
 *
 * Only the transitions valid from the current status are offered, and every
 * destructive action requires a written reason before it can be sent.
 */
export function ClinicActions({
  clinicId,
  status,
  clinicName,
}: {
  clinicId: string;
  status: string;
  clinicName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState<Decision | null>(null);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ affectedBookings: number } | null>(null);

  const available: Decision[] =
    status === "PENDING_REVIEW"
      ? ["approve", "request-changes", "reject"]
      : status === "CHANGES_REQUESTED"
        ? ["approve", "reject"]
        : status === "APPROVED"
          ? ["request-changes", "suspend", "deactivate"]
          : status === "SUSPENDED"
            ? ["reinstate", "deactivate"]
            : status === "REJECTED"
              ? ["approve", "deactivate"]
              : status === "DEACTIVATED"
                ? ["reinstate"]
                : [];

  async function run(decision: Decision) {
    const copy = COPY[decision];
    if (copy.requiresReason && reason.trim().length < 3) {
      setError("Give a reason — it is recorded in the audit log and sent to the clinic.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(copy.requiresReason ? { reason } : { note: reason }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not complete this action.");
        setPending(false);
        return;
      }
      if (body.affectedBookings > 0) {
        setResult({ affectedBookings: body.affectedBookings });
        router.refresh();
        setPending(false);
        return;
      }
      setOpen(null);
      setReason("");
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const icons: Record<Decision, typeof Check> = {
    approve: Check,
    reject: X,
    "request-changes": AlertTriangle,
    suspend: Ban,
    reinstate: RotateCcw,
    deactivate: ShieldOff,
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {available.map((decision) => {
          const copy = COPY[decision];
          const Icon = icons[decision];
          return (
            <Button
              key={decision}
              size="sm"
              variant={
                decision === "approve" || decision === "reinstate"
                  ? "primary"
                  : copy.danger
                    ? "danger"
                    : "secondary"
              }
              onClick={() => {
                setOpen(decision);
                setReason("");
                setError(null);
                setResult(null);
              }}
            >
              <Icon aria-hidden className="size-3.5" />
              {copy.label}
            </Button>
          );
        })}
      </div>

      {open && (
        <Modal
          open
          onClose={() => setOpen(null)}
          title={COPY[open].title}
          description={clinicName}
          footer={
            result ? (
              <Button
                onClick={() => {
                  setOpen(null);
                  setResult(null);
                  router.refresh();
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setOpen(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button
                  variant={COPY[open].danger ? "danger" : "primary"}
                  loading={pending}
                  onClick={() => void run(open)}
                >
                  {COPY[open].confirm}
                </Button>
              </>
            )
          }
        >
          <div className="space-y-4">
            {error && <FormError>{error}</FormError>}

            {result ? (
              <div className="rounded-md border border-[#e8d7b9] bg-warning-bg p-3.5">
                <p className="text-[0.8125rem] font-medium text-warning">
                  Done — but check the diary
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-warning/90">
                  This clinic has {result.affectedBookings} upcoming{" "}
                  {result.affectedBookings === 1 ? "appointment" : "appointments"} that{" "}
                  {result.affectedBookings === 1 ? "was" : "were"} not cancelled automatically. Decide
                  what should happen to {result.affectedBookings === 1 ? "it" : "them"} from Bookings.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
                  {COPY[open].description}
                </p>

                <div className="rounded-md border border-line bg-surface-muted/60 p-3">
                  <p className="text-[0.75rem] leading-relaxed text-ink-muted">{COPY[open].hint}</p>
                </div>

                <Field
                  label={COPY[open].requiresReason ? "Reason" : "Note"}
                  hint="Recorded in the audit log against your account."
                  required={COPY[open].requiresReason}
                  optional={!COPY[open].requiresReason}
                >
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
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
