import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { PageTransition, Reveal } from "@/components/ui/motion";
import { ProviderStatusPill } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/states";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminClinics } from "@/lib/data/admin";
import { formatDate } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Verification" };
export const dynamic = "force-dynamic";

export default async function AdminVerificationPage() {
  await requireAdminPage("/admin/verification");
  const { locale } = await getTranslations();

  const [pending, changes] = await Promise.all([
    getAdminClinics({ status: "PENDING_REVIEW", perPage: 50 }),
    getAdminClinics({ status: "CHANGES_REQUESTED", perPage: 50 }),
  ]);

  const queue = [...pending.clinics, ...changes.clinics];

  return (
    <PageTransition>
      <PageHeader
        title="Verification"
        description="Clinics waiting for a decision. Approving one is what puts the verified badge on its public profile, so check the registration details before you do."
      />

      {queue.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing waiting for review"
            description="Every clinic application has been decided. New submissions appear here."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {queue.map((clinic, index) => (
            <li key={clinic.id}>
              <Reveal index={index}>
                <article className="rounded-lg border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[0.9375rem] font-semibold text-navy-600">
                          {clinic.name}
                        </h2>
                        <ProviderStatusPill status={clinic.status} published={clinic.published} />
                      </div>
                      <p className="mt-1 text-[0.8125rem] text-ink-muted">
                        {clinic.district ? `${clinic.district}, ${clinic.city}` : clinic.city}
                      </p>
                      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[0.75rem] text-ink-muted">
                        <div className="flex gap-1.5">
                          <dt>Treatments</dt>
                          <dd className="font-medium text-ink tabular">{clinic._count.services}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt>Practitioners</dt>
                          <dd className="font-medium text-ink tabular">{clinic._count.staff}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt>Submitted</dt>
                          <dd className="font-medium text-ink">
                            {clinic.submittedAt ? formatDate(clinic.submittedAt, locale) : "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <Link
                      href={`/admin/clinics/${clinic.id}`}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-teal-500 px-4 text-[0.8125rem] font-medium text-white transition-colors hover:bg-teal-600"
                    >
                      Review application
                    </Link>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </PageTransition>
  );
}
