import { Users } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { PageTransition } from "@/components/ui/motion";
import { Badge } from "@/components/ui/badge";
import { BookingStatusPill } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { CustomerSearch } from "@/components/clinic/customer-search";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicCustomers } from "@/lib/data/clinic";
import { formatDate } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function ClinicCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireClinicPage("/clinic/customers");
  const params = await searchParams;
  const { locale } = await getTranslations();

  const query = typeof params.q === "string" ? params.q : undefined;
  // Scoped to this clinic: a ProviderCustomer belongs to exactly one clinic,
  // and is never shared with another, even for the same person.
  const customers = await getClinicCustomers(session.providerId!, query);

  return (
    <PageTransition>
      <PageHeader
        title="Customers"
        description="People who have booked with your clinic. These records are yours alone — no other clinic on Suay can see them."
      />

      <div className="mb-4">
        <CustomerSearch defaultValue={query ?? ""} />
      </div>

      {customers.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={Users}
            title={query ? "No customers match that search" : "No customers yet"}
            description={
              query
                ? "Try a different name, email address or phone number."
                : "A record is created the first time someone books with you, whether through Suay or at your front desk."
            }
          />
        </div>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th className="text-right">Appointments</Th>
                <Th>Last visit</Th>
                <Th>Next appointment</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const past = customer.bookings.filter(
                  (b) => b.startAt.getTime() < Date.now() && b.status === "COMPLETED",
                );
                const next = customer.bookings
                  .filter((b) => b.startAt.getTime() >= Date.now() && b.status === "CONFIRMED")
                  .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];

                return (
                  <Tr key={customer.id}>
                    <Td className="text-[0.8125rem] font-medium">{customer.name}</Td>
                    <Td className="text-[0.8125rem] text-ink-muted">
                      {customer.email && <span className="block break-all">{customer.email}</span>}
                      {customer.phone && <span className="block">{customer.phone}</span>}
                      {!customer.email && !customer.phone && "—"}
                    </Td>
                    <Td className="text-right text-[0.8125rem] tabular">{customer.bookings.length}</Td>
                    <Td className="text-[0.8125rem] text-ink-muted tabular">
                      {past[0] ? formatDate(past[0].startAt, locale) : "—"}
                    </Td>
                    <Td className="text-[0.8125rem]">
                      {next ? (
                        <span className="flex flex-col gap-1">
                          <span className="tabular">{formatDate(next.startAt, locale)}</span>
                          <BookingStatusPill status={next.status} />
                        </span>
                      ) : (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={customer.userId ? "teal" : "neutral"}>
                        {customer.userId ? "Suay account" : "Added by clinic"}
                      </Badge>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <p className="mt-4 max-w-2xl text-[0.75rem] leading-relaxed text-ink-subtle">
        Suay deliberately does not store clinical notes or medical history. Keep patient records in
        your own clinical system.
      </p>
    </PageTransition>
  );
}
