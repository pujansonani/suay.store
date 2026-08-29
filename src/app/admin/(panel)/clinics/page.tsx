import Link from "next/link";
import { Building2 } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { AdminClinicFilters } from "@/components/admin/clinic-filters";
import { PageTransition } from "@/components/ui/motion";
import { ProviderStatusPill } from "@/components/ui/status";
import { Rating } from "@/components/ui/rating";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminClinics } from "@/lib/data/admin";
import { formatDate } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Clinics" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminClinicsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/clinics");
  const params = await searchParams;
  const { locale } = await getTranslations();

  const result = await getAdminClinics({
    status: first(params.status),
    query: first(params.q),
    page: Number(first(params.page) ?? 1) || 1,
  });

  return (
    <PageTransition>
      <PageHeader
        title="Clinics"
        description="Every clinic on the platform, in any state. Suspended and deactivated clinics stay here with their full history."
      />

      <div className="mb-4">
        <AdminClinicFilters total={result.total} />
      </div>

      {result.clinics.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={Building2}
            title="No clinics match these filters"
            description="Try a different status or search term."
          />
        </div>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Clinic</Th>
                <Th>Location</Th>
                <Th>Status</Th>
                <Th>Rating</Th>
                <Th className="text-right">Treatments</Th>
                <Th className="text-right">Bookings</Th>
                <Th>Submitted</Th>
              </tr>
            </thead>
            <tbody>
              {result.clinics.map((clinic) => (
                <Tr key={clinic.id}>
                  <Td>
                    <Link
                      href={`/admin/clinics/${clinic.id}`}
                      className="text-[0.8125rem] font-medium text-navy-600 hover:text-teal-600"
                    >
                      {clinic.name}
                    </Link>
                    <span className="block text-[0.6875rem] text-ink-subtle">{clinic.slug}</span>
                  </Td>
                  <Td className="text-[0.8125rem] text-ink-muted">
                    {clinic.district ? `${clinic.district}, ${clinic.city}` : clinic.city}
                  </Td>
                  <Td>
                    <ProviderStatusPill status={clinic.status} published={clinic.published} />
                  </Td>
                  <Td>
                    <Rating value={clinic.ratingAverage} count={clinic.ratingCount} showCount={false} />
                  </Td>
                  <Td className="text-right text-[0.8125rem] tabular">{clinic._count.services}</Td>
                  <Td className="text-right text-[0.8125rem] tabular">{clinic._count.bookings}</Td>
                  <Td className="whitespace-nowrap text-[0.8125rem] text-ink-muted tabular">
                    {clinic.submittedAt ? formatDate(clinic.submittedAt, locale) : "—"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {result.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex justify-center gap-2">
          {Array.from({ length: result.totalPages }).map((_, i) => {
            const target = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
              const v = first(value);
              if (v && key !== "page") target.set(key, v);
            }
            if (i > 0) target.set("page", String(i + 1));
            const current = result.page === i + 1;
            return (
              <Link
                key={i}
                href={`/admin/clinics${target.toString() ? `?${target}` : ""}`}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "inline-flex size-9 items-center justify-center rounded-md border border-teal-500 bg-teal-500 text-[0.8125rem] font-medium text-white"
                    : "inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-[0.8125rem] text-ink-muted transition-colors hover:bg-surface-muted"
                }
              >
                {i + 1}
              </Link>
            );
          })}
        </nav>
      )}
    </PageTransition>
  );
}
