import Link from "next/link";
import { CalendarX } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { AdminTableFilters } from "@/components/admin/table-filters";
import { PageTransition } from "@/components/ui/motion";
import { Badge } from "@/components/ui/badge";
import { BookingStatusPill, PaymentStatusPill } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Pagination } from "@/components/admin/pagination";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminBookings } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/bookings");
  const params = await searchParams;
  const { locale } = await getTranslations();

  const result = await getAdminBookings({
    status: first(params.status),
    query: first(params.q),
    providerId: first(params.providerId),
    page: Number(first(params.page) ?? 1) || 1,
  });

  return (
    <PageTransition>
      <PageHeader
        title="Bookings"
        description="Every appointment across the platform, including those at suspended clinics."
      />

      <div className="mb-4">
        <AdminTableFilters
          total={result.total}
          searchPlaceholder="Search reference, patient or clinic"
          statusOptions={[
            { value: "CONFIRMED", label: "Confirmed" },
            { value: "PENDING_PAYMENT", label: "Awaiting payment" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "EXPIRED", label: "Expired" },
            { value: "NO_SHOW", label: "No show" },
          ]}
        />
      </div>

      {result.bookings.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={CalendarX} title="No bookings match these filters" description="Try a different status or search term." />
        </div>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>When</Th>
                <Th>Clinic</Th>
                <Th>Patient</Th>
                <Th>Treatment</Th>
                <Th>Source</Th>
                <Th>Status</Th>
                <Th className="text-right">Price</Th>
              </tr>
            </thead>
            <tbody>
              {result.bookings.map((booking) => (
                <Tr key={booking.id}>
                  <Td className="text-[0.8125rem] font-medium tabular">{booking.reference}</Td>
                  <Td className="whitespace-nowrap text-[0.8125rem] tabular">
                    {formatDateTime(booking.startAt, locale)}
                  </Td>
                  <Td className="text-[0.8125rem]">
                    <Link
                      href={`/admin/clinics/${booking.provider.id}`}
                      className="text-navy-600 hover:text-teal-600"
                    >
                      {booking.provider.name}
                    </Link>
                    {booking.provider.status !== "APPROVED" && (
                      <Badge tone="warning" className="ml-1.5">
                        {booking.provider.status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-[0.8125rem]">{booking.customerName}</Td>
                  <Td className="text-[0.8125rem] text-ink-muted">{booking.service.name}</Td>
                  <Td className="text-[0.75rem] text-ink-muted">
                    {booking.channel.replace(/_/g, " ").toLowerCase()}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <BookingStatusPill status={booking.status} />
                      {booking.payments[0] && <PaymentStatusPill status={booking.payments[0].status} />}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-right text-[0.8125rem] tabular">
                    {formatMoney(booking.priceMinor, booking.currency, locale)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <Pagination basePath="/admin/bookings" params={params} page={result.page} totalPages={result.totalPages} />
    </PageTransition>
  );
}
