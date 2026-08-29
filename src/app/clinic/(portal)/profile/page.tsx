import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { ClinicProfileForm } from "@/components/clinic/profile-form";
import { PublishToggle } from "@/components/clinic/publish-toggle";
import { PageTransition } from "@/components/ui/motion";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProviderStatusPill } from "@/components/ui/status";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicProfile } from "@/lib/data/clinic";
import { formatDate } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Clinic profile" };
export const dynamic = "force-dynamic";

export default async function ClinicProfilePage() {
  const session = await requireClinicPage("/clinic/profile");
  const { locale } = await getTranslations();
  const clinic = await getClinicProfile(session.providerId!);
  if (!clinic) return null;

  const isOwner = session.role === "CLINIC_ADMIN";

  return (
    <PageTransition className="max-w-3xl space-y-6">
      <PageHeader
        title="Clinic profile"
        description="What patients see on your public page. Changes take effect immediately."
        actions={
          clinic.published ? (
            <Link
              href={`/clinics/${clinic.slug}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3.5 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted"
            >
              <ExternalLink aria-hidden className="size-3.5" />
              View public page
            </Link>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Marketplace status</CardTitle>
            <CardDescription>
              Your clinic appears publicly only when it is both approved by Suay and published by you.
            </CardDescription>
          </div>
          <ProviderStatusPill status={clinic.status} published={clinic.published} />
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-line bg-surface-muted/50 p-3.5">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-500" />
            <div className="text-[0.8125rem] leading-relaxed text-ink-muted">
              {clinic.verificationStatus === "APPROVED" ? (
                <>
                  Your business and licence details were verified
                  {clinic.reviewedAt && <> on {formatDate(clinic.reviewedAt, locale)}</>}. The verified
                  badge on your public profile reflects that review.
                </>
              ) : (
                <>Verification is still in progress. Your profile shows no verified badge until it completes.</>
              )}
            </div>
          </div>

          {isOwner ? (
            <PublishToggle published={clinic.published} approved={clinic.status === "APPROVED"} />
          ) : (
            <p className="text-[0.8125rem] text-ink-muted">
              Only a clinic administrator can publish or unpublish the clinic.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Clinic details</CardTitle>
            <CardDescription>Name, description, contact details and policies.</CardDescription>
          </div>
        </CardHeader>
        <CardBody>
          {isOwner ? (
            <ClinicProfileForm
              defaults={{
                name: clinic.name,
                legalName: clinic.legalName ?? "",
                specialty: clinic.specialty ?? "",
                tagline: clinic.tagline ?? "",
                description: clinic.description ?? "",
                email: clinic.email ?? "",
                phone: clinic.phone ?? "",
                website: clinic.website ?? "",
                lineId: clinic.lineId ?? "",
                addressLine1: clinic.addressLine1 ?? "",
                district: clinic.district ?? "",
                city: clinic.city,
                postalCode: clinic.postalCode ?? "",
                cancellationPolicy: clinic.cancellationPolicy ?? "",
                bookingPolicy: clinic.bookingPolicy ?? "",
                cancellationWindowHours:
                  clinic.cancellationWindowHours === null ? "" : String(clinic.cancellationWindowHours),
              }}
            />
          ) : (
            <p className="text-[0.8125rem] text-ink-muted">
              Only a clinic administrator can change these details.
            </p>
          )}
        </CardBody>
      </Card>
    </PageTransition>
  );
}
