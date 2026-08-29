"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingStatusPill, PaymentStatusPill } from "@/components/ui/status";
import { Rating } from "@/components/ui/rating";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { AnimatePresence, FadeIn } from "@/components/ui/motion";
import type { Locale } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/i18n/format";
import { formatMoney, formatMoneyShort } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Props {
  locale: Locale;
  clinic: {
    id: string;
    name: string;
    legalName: string | null;
    description: string | null;
    specialty: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    addressLine1: string | null;
    district: string | null;
    city: string;
    postalCode: string | null;
    cancellationPolicy: string | null;
    bookingPolicy: string | null;
    createdAt: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    verificationStatus: string;
  };
  verification: {
    businessRegistrationNo: string | null;
    taxId: string | null;
    medicalLicenseNo: string | null;
    licenceAuthority: string | null;
    contactPersonName: string | null;
    contactPersonRole: string | null;
    contactPersonPhone: string | null;
    contactPersonEmail: string | null;
    documentRefs: string[];
    notes: string | null;
    status: string;
  } | null;
  members: { id: string; name: string; email: string; role: string; lastLoginAt: string | null }[];
  staff: {
    id: string;
    name: string;
    role: string;
    verified: boolean;
    active: boolean;
    credentials: string[];
    qualifications: string[];
    yearsExperience: number | null;
  }[];
  services: {
    id: string;
    name: string;
    durationMinutes: number;
    priceMinor: number;
    currency: string;
    active: boolean;
    serviceClass: string;
  }[];
  resources: { id: string; name: string; type: string; tag: string | null; active: boolean }[];
  bookings: {
    id: string;
    reference: string;
    status: string;
    startAt: string;
    priceMinor: number;
    currency: string;
    customerName: string;
    serviceName: string;
  }[];
  payments: {
    id: string;
    status: string;
    method: string;
    amountMinor: number;
    capturedAmountMinor: number;
    refundedAmountMinor: number;
    currency: string;
    createdAt: string;
    reference: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    status: string;
    isSample: boolean;
    createdAt: string;
    customerName: string;
  }[];
  audit: {
    id: string;
    action: string;
    summary: string | null;
    actorLabel: string | null;
    actorRole: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }[];
}

const TABS = [
  "Profile",
  "Verification",
  "Practitioners",
  "Services",
  "Bookings",
  "Payments",
  "Reviews",
  "Audit history",
] as const;

export function ClinicDetailTabs(props: Props) {
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("Profile");

  return (
    <div>
      <div role="tablist" aria-label="Clinic sections" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-[0.8125rem] font-medium transition-colors",
              tab === name
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-ink-muted hover:text-navy-600",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <AnimatePresence mode="wait" initial={false}>
          <FadeIn key={tab}>
            {tab === "Profile" && <ProfileTab {...props} />}
            {tab === "Verification" && <VerificationTab {...props} />}
            {tab === "Practitioners" && <PractitionersTab {...props} />}
            {tab === "Services" && <ServicesTab {...props} />}
            {tab === "Bookings" && <BookingsTab {...props} />}
            {tab === "Payments" && <PaymentsTab {...props} />}
            {tab === "Reviews" && <ReviewsTab {...props} />}
            {tab === "Audit history" && <AuditTab {...props} />}
          </FadeIn>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <h2 className="border-b border-line px-5 py-3.5 text-[0.9375rem] font-semibold text-navy-600">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 px-5 py-2.5 text-[0.8125rem]">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="max-w-md text-right text-ink">{value || "—"}</dd>
    </div>
  );
}

function ProfileTab({ clinic, members, resources, locale }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Panel title="Clinic information">
        <dl className="divide-y divide-line">
          <Row label="Trading name" value={clinic.name} />
          <Row label="Registered name" value={clinic.legalName} />
          <Row label="Speciality" value={clinic.specialty} />
          <Row
            label="Address"
            value={[clinic.addressLine1, clinic.district, clinic.city, clinic.postalCode]
              .filter(Boolean)
              .join(", ")}
          />
          <Row label="Phone" value={clinic.phone} />
          <Row label="Email" value={clinic.email} />
          <Row label="Website" value={clinic.website} />
          <Row label="Registered on" value={formatDate(clinic.createdAt, locale)} />
          <Row
            label="Submitted"
            value={clinic.submittedAt ? formatDate(clinic.submittedAt, locale) : "Not submitted"}
          />
          <Row
            label="Last reviewed"
            value={clinic.reviewedAt ? formatDate(clinic.reviewedAt, locale) : "Never"}
          />
        </dl>
      </Panel>

      <div className="space-y-5">
        <Panel title="Clinic accounts">
          {members.length === 0 ? (
            <EmptyState title="No accounts" description="This clinic has no user accounts." className="py-8" />
          ) : (
            <ul className="divide-y divide-line">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.8125rem] font-medium text-ink">{member.name}</p>
                    <p className="truncate text-[0.75rem] text-ink-muted">{member.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone="navy">{member.role.replace(/_/g, " ").toLowerCase()}</Badge>
                    <p className="mt-1 text-[0.6875rem] text-ink-subtle">
                      {member.lastLoginAt
                        ? `Last seen ${formatDate(member.lastLoginAt, locale)}`
                        : "Never signed in"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Rooms & equipment">
          {resources.length === 0 ? (
            <EmptyState title="None recorded" description="No rooms or equipment." className="py-8" />
          ) : (
            <ul className="divide-y divide-line">
              {resources.map((resource) => (
                <li key={resource.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="text-[0.8125rem] text-ink">{resource.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone="neutral">{resource.type === "ROOM" ? "Room" : "Equipment"}</Badge>
                    {!resource.active && <Badge tone="warning">Out of service</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Policies">
          <dl className="divide-y divide-line">
            <Row label="Cancellation" value={clinic.cancellationPolicy} />
            <Row label="Before appointment" value={clinic.bookingPolicy} />
          </dl>
        </Panel>
      </div>
    </div>
  );
}

function VerificationTab({ verification, clinic }: Props) {
  if (!verification) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={ShieldCheck}
          title="No verification details submitted"
          description="This clinic has not provided registration or licence information yet."
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Panel title="Business registration">
        <dl className="divide-y divide-line">
          <Row label="Registration number" value={verification.businessRegistrationNo} />
          <Row label="Tax ID" value={verification.taxId} />
          <Row label="Clinic licence" value={verification.medicalLicenseNo} />
          <Row label="Issuing authority" value={verification.licenceAuthority} />
          <Row
            label="Verification status"
            value={
              <Badge
                tone={
                  verification.status === "APPROVED"
                    ? "success"
                    : verification.status === "REJECTED"
                      ? "danger"
                      : "warning"
                }
              >
                {verification.status.replace(/_/g, " ").toLowerCase()}
              </Badge>
            }
          />
        </dl>
      </Panel>

      <div className="space-y-5">
        <Panel title="Person responsible">
          <dl className="divide-y divide-line">
            <Row label="Name" value={verification.contactPersonName} />
            <Row label="Role" value={verification.contactPersonRole} />
            <Row label="Phone" value={verification.contactPersonPhone} />
            <Row label="Email" value={verification.contactPersonEmail} />
          </dl>
        </Panel>

        <Panel title="Supporting documents">
          {verification.documentRefs.length === 0 ? (
            <p className="px-5 py-4 text-[0.8125rem] text-ink-muted">
              No documents referenced. This build records references only — Suay does not store
              uploaded identity documents.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {verification.documentRefs.map((ref) => (
                <li key={ref} className="px-5 py-2.5 text-[0.8125rem] text-ink">
                  {ref}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {verification.notes && (
          <Panel title="Notes from the clinic">
            <p className="px-5 py-4 text-[0.8125rem] leading-relaxed text-ink">{verification.notes}</p>
          </Panel>
        )}

        <div className="rounded-md border border-line bg-surface-muted/60 p-4">
          <p className="text-[0.75rem] leading-relaxed text-ink-muted">
            Approving this clinic sets its verification status to approved and allows it to publish.
            The verified badge patients see on{" "}
            <span className="font-medium text-navy-600">{clinic.name}</span> is a statement that Suay
            checked these details — so check them.
          </p>
        </div>
      </div>
    </div>
  );
}

function PractitionersTab({ staff }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function toggle(id: string, verified: boolean) {
    setPendingId(id);
    try {
      await fetch(`/api/admin/staff/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (staff.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState title="No practitioners" description="This clinic has not added any practitioners." />
      </div>
    );
  }

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Role</Th>
            <Th>Qualifications</Th>
            <Th>Registrations</Th>
            <Th className="text-right">Experience</Th>
            <Th>Verified</Th>
            <Th><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <Tr key={member.id}>
              <Td className="text-[0.8125rem] font-medium">
                {member.name}
                {!member.active && <Badge tone="neutral" className="ml-2">Off rota</Badge>}
              </Td>
              <Td className="text-[0.8125rem] text-ink-muted">{member.role}</Td>
              <Td className="max-w-xs text-[0.75rem] text-ink-muted">
                {member.qualifications.join("; ") || "—"}
              </Td>
              <Td className="max-w-xs text-[0.75rem] text-ink-muted">
                {member.credentials.join("; ") || "—"}
              </Td>
              <Td className="text-right text-[0.8125rem] tabular">
                {member.yearsExperience === null ? "—" : `${member.yearsExperience} yrs`}
              </Td>
              <Td>
                {member.verified ? (
                  <Badge tone="teal">
                    <BadgeCheck aria-hidden className="size-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge tone="neutral">Not verified</Badge>
                )}
              </Td>
              <Td className="text-right">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={pendingId === member.id}
                  onClick={() => void toggle(member.id, !member.verified)}
                >
                  {member.verified ? "Unverify" : "Verify"}
                </Button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

function ServicesTab({ services, locale }: Props) {
  if (services.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState title="No treatments" description="This clinic has not added any treatments." />
      </div>
    );
  }

  return (
    <TableWrap>
      <Table className="min-w-[36rem]">
        <thead>
          <tr>
            <Th>Treatment</Th>
            <Th>Type</Th>
            <Th className="text-right">Duration</Th>
            <Th className="text-right">Price</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <Tr key={service.id}>
              <Td className="text-[0.8125rem] font-medium">{service.name}</Td>
              <Td className="text-[0.75rem] text-ink-muted">
                {service.serviceClass.replace(/_/g, " ").toLowerCase()}
              </Td>
              <Td className="text-right text-[0.8125rem] tabular">{service.durationMinutes} min</Td>
              <Td className="text-right text-[0.8125rem] tabular">
                {service.priceMinor === 0
                  ? "Free"
                  : formatMoneyShort(service.priceMinor, service.currency, locale)}
              </Td>
              <Td>
                <Badge tone={service.active ? "success" : "neutral"}>
                  {service.active ? "Bookable" : "Hidden"}
                </Badge>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

function BookingsTab({ bookings, locale }: Props) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState title="No bookings" description="This clinic has no appointment history." />
      </div>
    );
  }

  return (
    <>
      <TableWrap>
        <Table className="min-w-[38rem]">
          <thead>
            <tr>
              <Th>Reference</Th>
              <Th>When</Th>
              <Th>Patient</Th>
              <Th>Treatment</Th>
              <Th>Status</Th>
              <Th className="text-right">Price</Th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <Tr key={booking.id}>
                <Td className="text-[0.8125rem] font-medium tabular">{booking.reference}</Td>
                <Td className="whitespace-nowrap text-[0.8125rem] tabular">
                  {formatDateTime(booking.startAt, locale)}
                </Td>
                <Td className="text-[0.8125rem]">{booking.customerName}</Td>
                <Td className="text-[0.8125rem] text-ink-muted">{booking.serviceName}</Td>
                <Td>
                  <BookingStatusPill status={booking.status} />
                </Td>
                <Td className="text-right text-[0.8125rem] tabular">
                  {formatMoney(booking.priceMinor, booking.currency, locale)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      <p className="mt-3 text-[0.75rem] text-ink-subtle">
        Showing the 20 most recent. Bookings are retained even when a clinic is suspended or
        deactivated.
      </p>
    </>
  );
}

function PaymentsTab({ payments, locale }: Props) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState title="No payments" description="This clinic has taken no payments." />
      </div>
    );
  }

  return (
    <TableWrap>
      <Table className="min-w-[38rem]">
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Booking</Th>
            <Th>Method</Th>
            <Th>Status</Th>
            <Th className="text-right">Captured</Th>
            <Th className="text-right">Refunded</Th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <Tr key={payment.id}>
              <Td className="whitespace-nowrap text-[0.8125rem] text-ink-muted tabular">
                {formatDate(payment.createdAt, locale)}
              </Td>
              <Td className="text-[0.8125rem] font-medium tabular">{payment.reference}</Td>
              <Td className="text-[0.8125rem] text-ink-muted">
                {payment.method === "PROMPTPAY" ? "PromptPay" : "Card"}
              </Td>
              <Td>
                <PaymentStatusPill status={payment.status} />
              </Td>
              <Td className="text-right text-[0.8125rem] tabular">
                {formatMoney(payment.capturedAmountMinor, payment.currency, locale)}
              </Td>
              <Td className="text-right text-[0.8125rem] tabular">
                {payment.refundedAmountMinor > 0
                  ? formatMoney(payment.refundedAmountMinor, payment.currency, locale)
                  : "—"}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

function ReviewsTab({ reviews, locale }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function moderate(id: string, status: string) {
    setPendingId(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState title="No reviews" description="This clinic has not received any reviews." />
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Rating value={review.rating} count={1} showCount={false} />
                <span className="text-[0.8125rem] font-medium text-navy-600">
                  {review.customerName}
                </span>
                {review.isSample && <Badge tone="neutral">Sample</Badge>}
                <Badge
                  tone={
                    review.status === "PUBLISHED"
                      ? "success"
                      : review.status === "REMOVED"
                        ? "danger"
                        : "warning"
                  }
                >
                  {review.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </div>
              <p className="mt-0.5 text-[0.75rem] text-ink-subtle">
                {formatDate(review.createdAt, locale)}
              </p>
            </div>

            <label className="shrink-0">
              <span className="sr-only">Moderate review</span>
              <Select
                className="h-8 w-auto min-w-40 text-[0.75rem]"
                value={review.status}
                disabled={pendingId === review.id}
                onChange={(e) => void moderate(review.id, e.target.value)}
              >
                <option value="PUBLISHED">Published</option>
                <option value="PENDING_MODERATION">Hold for moderation</option>
                <option value="REMOVED">Remove</option>
              </Select>
            </label>
          </div>

          {review.comment && (
            <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink">{review.comment}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function AuditTab({ audit, locale }: Props) {
  if (audit.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState title="No audit entries" description="Nothing has been recorded for this clinic." />
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {audit.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-line bg-surface px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <code className="text-[0.75rem] font-medium text-navy-600">{entry.action}</code>
            <span className="text-[0.6875rem] text-ink-subtle tabular">
              {formatDateTime(entry.createdAt, locale)}
            </span>
          </div>
          <p className="mt-1 text-[0.8125rem] text-ink">{entry.summary ?? "—"}</p>
          <p className="text-[0.6875rem] text-ink-subtle">
            {entry.actorLabel ?? "System"} · {entry.actorRole.toLowerCase()}
          </p>
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-[0.6875rem] text-ink-muted hover:text-navy-600">
                Details
              </summary>
              <pre className="mt-1.5 overflow-x-auto rounded-sm bg-canvas p-2 text-[0.6875rem] text-ink-muted">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}
