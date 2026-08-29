"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarX, MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingStatusPill, PaymentStatusPill } from "@/components/ui/status";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import type { Locale } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/i18n/format";
import { formatMoneyShort } from "@/lib/money";

export interface ClinicBookingRow {
  id: string;
  reference: string;
  status: string;
  channel: string;
  startAt: string;
  endAt: string;
  priceMinor: number;
  currency: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNote: string | null;
  cancelReason: string | null;
  serviceName: string;
  staffName: string | null;
  paymentStatus: string | null;
  resources: string[];
}

const CHANNEL_LABEL: Record<string, string> = {
  MARKETPLACE: "Suay",
  PROVIDER_MANUAL: "Front desk",
  WALK_IN: "Walk-in",
  PHONE: "Phone",
  LINE: "LINE",
};

export function ClinicBookingsTable({
  bookings,
  locale,
  staff,
}: {
  bookings: ClinicBookingRow[];
  locale: Locale;
  staff: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [selected, setSelected] = React.useState<ClinicBookingRow | null>(null);
  const [action, setAction] = React.useState<"cancel" | "complete" | "no_show" | null>(null);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  async function run() {
    if (!selected || !action) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/clinic/bookings/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "cancel" ? { action, reason } : { action }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not update this appointment.");
        setPending(false);
        return;
      }
      setSelected(null);
      setAction(null);
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
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Input
          defaultValue={params.get("q") ?? ""}
          placeholder="Search name, reference or treatment"
          aria-label="Search appointments"
          className="h-9 w-full max-w-xs text-[0.8125rem]"
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
        />
        <Select
          aria-label="Filter by status"
          className="h-9 w-auto min-w-40 text-[0.8125rem]"
          value={params.get("status") ?? "all"}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING_PAYMENT">Awaiting payment</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NO_SHOW">No show</option>
          <option value="EXPIRED">Expired</option>
        </Select>
        <Select
          aria-label="Filter by practitioner"
          className="h-9 w-auto min-w-44 text-[0.8125rem]"
          value={params.get("staffId") ?? ""}
          onChange={(e) => update("staffId", e.target.value)}
        >
          <option value="">All practitioners</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={CalendarX}
            title="No appointments match these filters"
            description="Try a different status, practitioner or search term."
          />
        </div>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Patient</Th>
                <Th>Treatment</Th>
                <Th>Practitioner</Th>
                <Th>Source</Th>
                <Th>Status</Th>
                <Th className="text-right">Price</Th>
                <Th><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <Tr key={booking.id}>
                  <Td className="whitespace-nowrap">
                    <span className="block text-[0.8125rem] tabular">
                      {formatDate(booking.startAt, locale, { day: "numeric", month: "short" })}
                    </span>
                    <span className="block text-[0.75rem] text-ink-muted tabular">
                      {formatTime(booking.startAt, locale)}–{formatTime(booking.endAt, locale)}
                    </span>
                  </Td>
                  <Td>
                    <span className="block text-[0.8125rem] font-medium">{booking.customerName}</span>
                    <span className="block text-[0.75rem] text-ink-muted tabular">
                      {booking.reference}
                    </span>
                  </Td>
                  <Td className="text-[0.8125rem]">{booking.serviceName}</Td>
                  <Td className="text-[0.8125rem] text-ink-muted">{booking.staffName ?? "—"}</Td>
                  <Td>
                    <Badge tone="neutral">{CHANNEL_LABEL[booking.channel] ?? booking.channel}</Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <BookingStatusPill status={booking.status} />
                      {booking.paymentStatus && <PaymentStatusPill status={booking.paymentStatus} />}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-right text-[0.8125rem] font-medium tabular">
                    {formatMoneyShort(booking.priceMinor, booking.currency, locale)}
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Manage appointment ${booking.reference}`}
                      onClick={() => {
                        setSelected(booking);
                        setAction(null);
                        setError(null);
                      }}
                    >
                      <MoreHorizontal aria-hidden className="size-4" />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <Modal
        open={selected !== null}
        onClose={() => {
          setSelected(null);
          setAction(null);
          setError(null);
        }}
        title={selected ? `${selected.serviceName}` : ""}
        description={selected ? `${selected.customerName} · ${selected.reference}` : undefined}
        size="md"
        footer={
          action ? (
            <>
              <Button variant="ghost" onClick={() => setAction(null)} disabled={pending}>
                Back
              </Button>
              <Button
                variant={action === "cancel" ? "danger" : "primary"}
                loading={pending}
                onClick={() => void run()}
              >
                {action === "cancel"
                  ? "Cancel appointment"
                  : action === "complete"
                    ? "Mark completed"
                    : "Mark no-show"}
              </Button>
            </>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-4">
            {error && <FormError>{error}</FormError>}

            <dl className="grid gap-x-6 gap-y-2 text-[0.8125rem] sm:grid-cols-2">
              <div>
                <dt className="text-ink-subtle">When</dt>
                <dd className="text-ink tabular">
                  {formatDate(selected.startAt, locale, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {formatTime(selected.startAt, locale)}–{formatTime(selected.endAt, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Practitioner</dt>
                <dd className="text-ink">{selected.staffName ?? "Not assigned"}</dd>
              </div>
              {selected.customerEmail && (
                <div>
                  <dt className="text-ink-subtle">Email</dt>
                  <dd className="break-all text-ink">{selected.customerEmail}</dd>
                </div>
              )}
              {selected.customerPhone && (
                <div>
                  <dt className="text-ink-subtle">Phone</dt>
                  <dd className="text-ink">{selected.customerPhone}</dd>
                </div>
              )}
              {selected.resources.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-ink-subtle">Reserved</dt>
                  <dd className="text-ink">{selected.resources.join(", ")}</dd>
                </div>
              )}
              {selected.customerNote && (
                <div className="sm:col-span-2">
                  <dt className="text-ink-subtle">Patient note</dt>
                  <dd className="text-ink">{selected.customerNote}</dd>
                </div>
              )}
              {selected.cancelReason && (
                <div className="sm:col-span-2">
                  <dt className="text-ink-subtle">Cancellation reason</dt>
                  <dd className="text-ink">{selected.cancelReason}</dd>
                </div>
              )}
            </dl>

            {action === "cancel" && (
              <Field
                label="Reason for cancelling"
                hint="Included in the message sent to the patient."
                optional
              >
                {(props) => (
                  <Textarea
                    {...props}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    data-autofocus
                  />
                )}
              </Field>
            )}

            {!action && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {["PENDING_PAYMENT", "CONFIRMED"].includes(selected.status) && (
                  <Button variant="danger" size="sm" onClick={() => setAction("cancel")}>
                    Cancel appointment
                  </Button>
                )}
                {selected.status === "CONFIRMED" &&
                  new Date(selected.startAt).getTime() < Date.now() && (
                    <>
                      <Button size="sm" onClick={() => setAction("complete")}>
                        Mark completed
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setAction("no_show")}>
                        Mark no-show
                      </Button>
                    </>
                  )}
                {selected.status === "CONFIRMED" &&
                  new Date(selected.startAt).getTime() >= Date.now() && (
                    <p className="text-[0.75rem] text-ink-muted">
                      This appointment can be marked completed once it has taken place.
                    </p>
                  )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
