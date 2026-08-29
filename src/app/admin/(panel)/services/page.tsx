import Link from "next/link";
import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { AdminTableFilters } from "@/components/admin/table-filters";
import { Pagination } from "@/components/admin/pagination";
import { PageTransition } from "@/components/ui/motion";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminServices } from "@/lib/data/admin";
import { formatMoneyShort } from "@/lib/money";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Services" };
export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/services");
  const params = await searchParams;
  const { locale } = await getTranslations();

  const result = await getAdminServices(Number(first(params.page) ?? 1) || 1, first(params.q));

  return (
    <PageTransition>
      <PageHeader
        title="Services"
        description="Every treatment listed by every clinic. Useful for spotting unsupported claims or mispriced entries."
      />

      <div className="mb-4">
        <AdminTableFilters total={result.total} searchPlaceholder="Search treatment or clinic" />
      </div>

      {result.services.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={Sparkles} title="No services match" description="Try a different search term." />
        </div>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Treatment</Th>
                <Th>Clinic</Th>
                <Th>Type</Th>
                <Th className="text-right">Duration</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Bookings</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {result.services.map((service) => (
                <Tr key={service.id}>
                  <Td className="text-[0.8125rem] font-medium">
                    {service.name}
                    {service.isMedicalAesthetic && (
                      <Badge tone="navy" className="ml-2">Medical</Badge>
                    )}
                  </Td>
                  <Td className="text-[0.8125rem]">
                    <Link
                      href={`/admin/clinics/${service.provider.id}`}
                      className="text-navy-600 hover:text-teal-600"
                    >
                      {service.provider.name}
                    </Link>
                  </Td>
                  <Td className="text-[0.75rem] text-ink-muted">
                    {service.serviceClass.replace(/_/g, " ").toLowerCase()}
                  </Td>
                  <Td className="text-right text-[0.8125rem] tabular">{service.durationMinutes} min</Td>
                  <Td className="text-right text-[0.8125rem] tabular">
                    {service.priceMinor === 0
                      ? "Free"
                      : formatMoneyShort(service.priceMinor, service.currency, locale)}
                  </Td>
                  <Td className="text-right text-[0.8125rem] tabular">{service._count.bookings}</Td>
                  <Td>
                    <Badge tone={service.active ? "success" : "neutral"}>
                      {service.active ? "Active" : "Hidden"}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <Pagination basePath="/admin/services" params={params} page={result.page} totalPages={result.totalPages} />
    </PageTransition>
  );
}
