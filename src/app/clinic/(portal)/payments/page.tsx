import { CreditCard } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { StatTile } from "@/components/clinic/stat-tile";
import { PageTransition } from "@/components/ui/motion";
import { PaymentStatusPill } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicPayments } from "@/lib/data/clinic";
import { getPolicy } from "@/lib/config";
import { formatMoney, formatMoneyShort, bpsOf } from "@/lib/money";
import { formatDate } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function ClinicPaymentsPage() {
  const session = await requireClinicPage("/clinic/payments");
  const { locale } = await getTranslations();

  const [{ payments, grossMinor, refundedMinor, count }, policy] = await Promise.all([
    getClinicPayments(session.providerId!),
    getPolicy(),
  ]);

  const netCollected = grossMinor - refundedMinor;
  const commission = bpsOf(netCollected, policy.commissionBps);

  return (
    <PageTransition>
      <PageHeader
        title="Payments"
        description="Payments taken through Suay for your clinic. This demonstration uses a simulated gateway — no real money moves."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Collected"
          value={formatMoneyShort(grossMinor, "THB", locale)}
          hint={`${count} ${count === 1 ? "payment" : "payments"}`}
          icon={CreditCard}
        />
        <StatTile label="Refunded" value={formatMoneyShort(refundedMinor, "THB", locale)} hint="All time" />
        <StatTile
          label="Platform commission"
          value={formatMoneyShort(commission, "THB", locale)}
          hint={`${(policy.commissionBps / 100).toFixed(1)}% · configurable, illustrative only`}
        />
        <StatTile
          label="Net to clinic"
          value={formatMoneyShort(netCollected - commission, "THB", locale)}
          hint="Collected, less refunds and commission"
          tone="positive"
        />
      </div>

      <div className="mt-6">
        {payments.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface">
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              description="Payments appear here once patients book and pay through Suay."
            />
          </div>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Reference</Th>
                  <Th>Patient</Th>
                  <Th>Treatment</Th>
                  <Th>Method</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="text-right">Refunded</Th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td className="whitespace-nowrap text-[0.8125rem] text-ink-muted tabular">
                      {formatDate(payment.capturedAt ?? payment.createdAt, locale)}
                    </Td>
                    <Td className="text-[0.8125rem] font-medium tabular">
                      {payment.booking.reference}
                    </Td>
                    <Td className="text-[0.8125rem]">{payment.booking.customerName}</Td>
                    <Td className="text-[0.8125rem] text-ink-muted">{payment.booking.service.name}</Td>
                    <Td className="text-[0.8125rem] text-ink-muted">
                      {payment.method === "PROMPTPAY" ? "PromptPay" : payment.displayLabel ?? "Card"}
                    </Td>
                    <Td>
                      <PaymentStatusPill status={payment.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-right text-[0.8125rem] font-medium tabular">
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

      <p className="mt-4 max-w-2xl text-[0.75rem] leading-relaxed text-ink-subtle">
        Commission is shown for illustration and is configurable by the platform. No payout schedule
        is implied by this screen, and no card details are ever stored by Suay.
      </p>
    </PageTransition>
  );
}
