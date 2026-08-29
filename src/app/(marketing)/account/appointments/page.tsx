import Link from "next/link";
import { CalendarX } from "lucide-react";

import { AppointmentCard, type AppointmentCardBooking } from "@/components/account/appointment-card";
import { EmptyState } from "@/components/ui/states";
import { PageTransition } from "@/components/ui/motion";
import { requireCustomerPage } from "@/lib/auth/routes";
import { getCustomerBookings } from "@/lib/data/customer";
import { getPolicy } from "@/lib/config";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "My appointments" };
export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const session = await requireCustomerPage("/account/appointments");
  const { locale } = await getTranslations();

  const [{ upcoming, past, cancelled }, policy] = await Promise.all([
    getCustomerBookings(session.id),
    getPolicy(),
  ]);

  type Row = Awaited<ReturnType<typeof getCustomerBookings>>["upcoming"][number];

  function toCard(booking: Row): AppointmentCardBooking {
    const upcomingBooking =
      booking.startAt.getTime() > Date.now() &&
      ["CONFIRMED", "PENDING_PAYMENT"].includes(booking.status);

    return {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      durationMinutes: booking.durationMinutes,
      priceMinor: booking.priceMinor,
      currency: booking.currency,
      serviceName: booking.service.name,
      staffName: booking.staff?.name ?? null,
      providerName: booking.provider.name,
      providerSlug: booking.provider.slug,
      providerPhone: booking.provider.phone,
      providerLocation: booking.provider.district
        ? `${booking.provider.district}, ${booking.provider.city}`
        : booking.provider.city,
      cancellationPolicy: booking.provider.cancellationPolicy,
      cancellationWindowHours:
        booking.provider.cancellationWindowHours ?? policy.cancellationFreeHours,
      paymentStatus: booking.payments[0]?.status ?? null,
      paymentLabel: booking.payments[0]?.displayLabel ?? null,
      hasReview: Boolean(booking.review),
      reviewRating: booking.review?.rating ?? null,
      canCancel: upcomingBooking,
      // The clinic may still move an appointment the customer cannot.
      canReschedule:
        upcomingBooking &&
        policy.allowCustomerReschedule &&
        booking.rescheduleCount < policy.maxReschedulesPerBooking &&
        // A clinic that has been suspended cannot take a new time.
        booking.provider.status === "APPROVED",
      canReview: booking.status === "COMPLETED" && !booking.review,
    };
  }

  return (
    <PageTransition className="space-y-10">
      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="text-[0.9375rem] font-semibold text-navy-600">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="mt-3 rounded-lg border border-line bg-surface">
            <EmptyState
              icon={CalendarX}
              title="You have no upcoming appointments"
              description="Browse verified clinics to book your next visit."
              action={
                <Link
                  href="/clinics"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-teal-500 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                >
                  Find a clinic
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {upcoming.map((booking, index) => (
              <AppointmentCard
                key={booking.id}
                booking={toCard(booking)}
                locale={locale}
                index={index}
              />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past-heading">
          <h2 id="past-heading" className="text-[0.9375rem] font-semibold text-navy-600">
            Past appointments
          </h2>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">
            You can review a clinic once your appointment has been completed.
          </p>
          <div className="mt-3 space-y-3">
            {past.map((booking, index) => (
              <AppointmentCard
                key={booking.id}
                booking={toCard(booking)}
                locale={locale}
                index={index}
              />
            ))}
          </div>
        </section>
      )}

      {cancelled.length > 0 && (
        <section aria-labelledby="cancelled-heading">
          <h2 id="cancelled-heading" className="text-[0.9375rem] font-semibold text-navy-600">
            Cancelled and expired
          </h2>
          <div className="mt-3 space-y-3">
            {cancelled.map((booking, index) => (
              <AppointmentCard
                key={booking.id}
                booking={toCard(booking)}
                locale={locale}
                index={index}
              />
            ))}
          </div>
        </section>
      )}
    </PageTransition>
  );
}
