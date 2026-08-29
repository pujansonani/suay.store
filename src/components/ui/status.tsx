import * as React from "react";

import { Badge } from "@/components/ui/badge";

/**
 * Status is always rendered as a labelled pill, never as a bare coloured dot.
 * Colour reinforces the label; it never carries the meaning on its own.
 */

type Tone = "neutral" | "teal" | "success" | "warning" | "danger" | "navy";

const BOOKING_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  COMPLETED: { label: "Completed", tone: "navy" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  NO_SHOW: { label: "No show", tone: "danger" },
  REJECTED: { label: "Declined", tone: "danger" },
};

export function BookingStatusPill({ status }: { status: string }) {
  const entry = BOOKING_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

const PROVIDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_REVIEW: { label: "Pending review", tone: "warning" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
  DEACTIVATED: { label: "Deactivated", tone: "neutral" },
};

export function ProviderStatusPill({
  status,
  published,
}: {
  status: string;
  published?: boolean;
}) {
  const entry = PROVIDER_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone={entry.tone}>{entry.label}</Badge>
      {status === "APPROVED" && (
        <Badge tone={published ? "teal" : "neutral"}>
          {published ? "Published" : "Not published"}
        </Badge>
      )}
    </span>
  );
}

const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "warning" },
  AUTHORIZED: { label: "Authorised", tone: "teal" },
  CAPTURED: { label: "Paid", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  REFUNDED: { label: "Refunded", tone: "navy" },
  PARTIALLY_REFUNDED: { label: "Partly refunded", tone: "navy" },
};

export function PaymentStatusPill({ status }: { status: string }) {
  const entry = PAYMENT_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
