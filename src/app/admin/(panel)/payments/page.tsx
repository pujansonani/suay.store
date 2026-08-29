import Link from "next/link";
import { CreditCard } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { StatTile } from "@/components/clinic/stat-tile";
import { Pagination } from "@/components/admin/pagination";
import { PageTransition } from "@/components/ui/motion";
import { PaymentStatusPill } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminPayments } from "@/lib/data/admin";
import { formatDate } from "@/lib/i18n/format";
import { formatMoney, formatMoneyShort } from "@/lib/money";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/payments");
  const params = await searchParams;
  const { locale } = await getTranslations();
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page ?? 1) || 1;

  const result = await getAdminPayments(page);

  return (
    <PageTransition>
      <PageHeader
        title="Payments"
        description="Every payment across the platform. This deployment uses a simulated gateway — no card data is collected and no money moves."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Captured"
          value={formatMoneyShort(result.grossMinor, "THB", locale)}
          hint="All clinics, all time"
          icon={CreditCard}
        />
        <StatTile label="Refunded" value={formatMoneyShort(result.refundedMinor, "THB", locale)} hint="All time" />
        <StatTile
          label="Net"
          value={formatMoneyShort(result.grossMinor - result.refundedMinor, "THB", locale)}
          hint="Captured less refunds"
          tone="positive"
        />
      </div>

      <div className="mt-6">
        {result.payments.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface">
            <EmptyState icon={CreditCard} title="No payments" description="No payments have been taken yet." />
          </div>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Booking</Th>
                  <Th>Clinic</Th>
                  <Th>Patient</Th>
                  <Th>Gateway</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="text-right">Refunded</Th>
                </tr>
              </thead>
              <tbody>
                {result.payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td className="whitespace-nowrap text-[0.8125rem] text-ink-muted tabular">
                      {formatDate(payment.createdAt, locale)}
                    </Td>
                    <Td className="text-[0.8125rem] font-medium tabular">{payment.booking.reference}</Td>
                    <Td className="text-[0.8125rem]">
                      <Link
                        href={`/admin/clinics/${payment.provider.id}`}
                        className="text-navy-600 hover:text-teal-600"
                      >
                        {payment.provider.name}
                      </Link>
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-muted">{payment.booking.customerName}</Td>
                    <Td className="text-[0.75rem] text-ink-muted">
                      {payment.gateway} · {payment.method === "PROMPTPAY" ? "PromptPay" : "Card"}
                    </Td>
                    <Td>
                      <PaymentStatusPill status={payment.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-right text-[0.8125rem] tabular">
                      {formatMoney(payment.capturedAmountMinor || payment.amountMinor, payment.currency, locale)}
                    </Td>
                    <Td className="whitespace-nowrap text-right text-[0.8125rem] tabular">
                      {payment.refundedAmountMinor > 0
                        ? formatMoney(payment.refundedAmountMinor, payment.currency, locale)
                        : "—"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </div>

      <Pagination basePath="/admin/payments" params={params} page={result.page} totalPages={result.totalPages} />
    </PageTransition>
  );
}
