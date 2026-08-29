import { notFound } from "next/navigation";

import { RescheduleFlow } from "@/components/account/reschedule-flow";
import { PageTransition } from "@/components/ui/motion";
import { requireCustomerPage } from "@/lib/auth/routes";
import { prisma } from "@/lib/db";
import { getPolicy } from "@/lib/config";
import { dateKeyOf } from "@/lib/time";

export const metadata = { title: "Reschedule appointment" };
export const dynamic = "force-dynamic";

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCustomerPage("/account/appointments");
  const { id } = await params;

  // Scoped by customerId: another customer's booking is simply not found.
  const booking = await prisma.booking.findFirst({
    where: { id, customerId: session.id },
    select: {
      id: true,
      reference: true,
      status: true,
      startAt: true,
      rescheduleCount: true,
      serviceId: true,
      staffId: true,
      service: { select: { name: true, durationMinutes: true } },
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          cancellationPolicy: true,
        },
      },
    },
  });

  if (!booking) notFound();

  const policy = await getPolicy();

  const blocked =
    !["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status)
      ? "This appointment can no longer be rescheduled."
      : booking.startAt.getTime() < Date.now()
        ? "This appointment has already taken place."
        : booking.provider.status !== "APPROVED"
          ? "This clinic is not currently accepting changes. Please contact them directly."
          : !policy.allowCustomerReschedule
            ? "Please contact the clinic to change this appointment."
            : booking.rescheduleCount >= policy.maxReschedulesPerBooking
              ? "This appointment has already been rescheduled the maximum number of times. Please contact the clinic."
              : null;

  return (
    <PageTransition>
      <RescheduleFlow
        booking={{
          id: booking.id,
          reference: booking.reference,
          startAt: booking.startAt.toISOString(),
          serviceId: booking.serviceId,
          serviceName: booking.service.name,
          durationMinutes: booking.service.durationMinutes,
          providerId: booking.provider.id,
          providerName: booking.provider.name,
          providerSlug: booking.provider.slug,
          cancellationPolicy: booking.provider.cancellationPolicy,
        }}
        initialDate={dateKeyOf(booking.startAt)}
        blockedReason={blocked}
      />
    </PageTransition>
  );
}
