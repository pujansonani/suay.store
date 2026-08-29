import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { ClinicActions } from "@/components/admin/clinic-actions";
import { ClinicDetailTabs } from "@/components/admin/clinic-detail-tabs";
import { PageTransition } from "@/components/ui/motion";
import { ProviderStatusPill } from "@/components/ui/status";
import { Rating } from "@/components/ui/rating";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminClinic, getClinicAuditTrail } from "@/lib/data/admin";
import { getTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinic = await getAdminClinic(id);
  return { title: clinic?.name ?? "Clinic" };
}

export default async function AdminClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("/admin/clinics");
  const { id } = await params;
  const { locale } = await getTranslations();

  const [clinic, audit] = await Promise.all([getAdminClinic(id), getClinicAuditTrail(id)]);
  if (!clinic) notFound();

  return (
    <PageTransition>
      <Link
        href="/admin/clinics"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-teal-600"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        All clinics
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold text-navy-600">{clinic.name}</h1>
            <ProviderStatusPill status={clinic.status} published={clinic.published} />
          </div>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">
            {clinic.district ? `${clinic.district}, ${clinic.city}` : clinic.city}
            {clinic.legalName && ` · ${clinic.legalName}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Rating value={clinic.ratingAverage} count={clinic.ratingCount} />
            {clinic.published && (
              <Link
                href={`/clinics/${clinic.slug}`}
                className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-teal-600 hover:text-teal-700"
              >
                <ExternalLink aria-hidden className="size-3.5" />
                Public profile
              </Link>
            )}
          </div>
        </div>

        <ClinicActions clinicId={clinic.id} status={clinic.status} clinicName={clinic.name} />
      </div>

      {(clinic.reviewNote || clinic.suspensionReason) && (
        <div className="mt-5 rounded-md border border-[#e8d7b9] bg-warning-bg p-4">
          <p className="text-[0.8125rem] font-medium text-warning">
            {clinic.suspensionReason ? "Suspension reason" : "Last review note"}
          </p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-warning/90">
            {clinic.suspensionReason ?? clinic.reviewNote}
          </p>
        </div>
      )}

      <div className="mt-6">
        <ClinicDetailTabs
          locale={locale}
          clinic={{
            id: clinic.id,
            name: clinic.name,
            legalName: clinic.legalName,
            description: clinic.description,
            specialty: clinic.specialty,
            email: clinic.email,
            phone: clinic.phone,
            website: clinic.website,
            addressLine1: clinic.addressLine1,
            district: clinic.district,
            city: clinic.city,
            postalCode: clinic.postalCode,
            cancellationPolicy: clinic.cancellationPolicy,
            bookingPolicy: clinic.bookingPolicy,
            createdAt: clinic.createdAt.toISOString(),
            submittedAt: clinic.submittedAt?.toISOString() ?? null,
            reviewedAt: clinic.reviewedAt?.toISOString() ?? null,
            verificationStatus: clinic.verificationStatus,
          }}
          verification={
            clinic.verification
              ? {
                  businessRegistrationNo: clinic.verification.businessRegistrationNo,
                  taxId: clinic.verification.taxId,
                  medicalLicenseNo: clinic.verification.medicalLicenseNo,
                  licenceAuthority: clinic.verification.licenceAuthority,
                  contactPersonName: clinic.verification.contactPersonName,
                  contactPersonRole: clinic.verification.contactPersonRole,
                  contactPersonPhone: clinic.verification.contactPersonPhone,
                  contactPersonEmail: clinic.verification.contactPersonEmail,
                  documentRefs: clinic.verification.documentRefs,
                  notes: clinic.verification.notes,
                  status: clinic.verification.status,
                }
              : null
          }
          members={clinic.members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role,
            lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
          }))}
          staff={clinic.staff}
          services={clinic.services}
          resources={clinic.resources}
          bookings={clinic.bookings.map((b) => ({
            id: b.id,
            reference: b.reference,
            status: b.status,
            startAt: b.startAt.toISOString(),
            priceMinor: b.priceMinor,
            currency: b.currency,
            customerName: b.customerName,
            serviceName: b.service.name,
          }))}
          payments={clinic.payments.map((p) => ({
            id: p.id,
            status: p.status,
            method: p.method,
            amountMinor: p.amountMinor,
            capturedAmountMinor: p.capturedAmountMinor,
            refundedAmountMinor: p.refundedAmountMinor,
            currency: p.currency,
            createdAt: p.createdAt.toISOString(),
            reference: p.booking.reference,
          }))}
          reviews={clinic.reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            status: r.status,
            isSample: r.isSample,
            createdAt: r.createdAt.toISOString(),
            customerName: r.customer.name,
          }))}
          audit={audit.map((entry) => ({
            id: entry.id,
            action: entry.action,
            summary: entry.summary,
            actorLabel: entry.actorLabel,
            actorRole: entry.actorRole,
            createdAt: entry.createdAt.toISOString(),
            metadata: entry.metadata as Record<string, unknown> | null,
          }))}
        />
      </div>
    </PageTransition>
  );
}
