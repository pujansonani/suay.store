import Link from "next/link";

import { PageHeader } from "@/components/clinic/page-header";
import { ClinicBookingsTable } from "@/components/clinic/bookings-table";
import { PageTransition } from "@/components/ui/motion";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicBookings, getClinicStaff } from "@/lib/data/clinic";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Appointments" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClinicBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireClinicPage("/clinic/bookings");
  const params = await searchParams;
  const { locale } = await getTranslations();

  const providerId = session.providerId!;
  const page = Number(first(params.page) ?? 1) || 1;

  const [result, staff] = await Promise.all([
    getClinicBookings(providerId, {
      status: first(params.status),
      staffId: first(params.staffId),
      query: first(params.q),
      page,
    }),
    getClinicStaff(providerId),
  ]);

  return (
    <PageTransition>
      <PageHeader
        title="Appointments"
        description="Every appointment at your clinic, whether booked on Suay or entered at your front desk."
        actions={
          <Link
            href="/clinic/calendar"
            className="inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-3.5 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted"
          >
            Calendar view
          </Link>
        }
      />

      <ClinicBookingsTable
        locale={locale}
        staff={staff.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))}
        bookings={result.bookings.map((booking) => ({
          id: booking.id,
          reference: booking.reference,
          status: booking.status,
          channel: booking.channel,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
          priceMinor: booking.priceMinor,
          currency: booking.currency,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          customerNote: booking.customerNote,
          cancelReason: booking.cancelReason,
          serviceName: booking.service.name,
          staffName: booking.staff?.name ?? null,
          paymentStatus: booking.payments[0]?.status ?? null,
          resources: booking.resourceAssignments.map((a) => a.resource.name),
        }))}
      />

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
                href={`/clinic/bookings${target.toString() ? `?${target}` : ""}`}
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
