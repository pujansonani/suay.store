import "server-only";

import { prisma } from "@/lib/db";

/**
 * Customer reads.
 *
 * Every query here is filtered by `customerId` taken from the session. There
 * is no code path that accepts a customer id from the request.
 */
export async function getCustomerBookings(customerId: string) {
  const bookings = await prisma.booking.findMany({
    where: { customerId },
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      reference: true,
      status: true,
      startAt: true,
      endAt: true,
      durationMinutes: true,
      priceMinor: true,
      currency: true,
      holdExpiresAt: true,
      customerNote: true,
      cancelReason: true,
      cancelledByRole: true,
      rescheduleCount: true,
      service: { select: { id: true, name: true, isMedicalAesthetic: true } },
      staff: { select: { name: true, role: true } },
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          district: true,
          city: true,
          phone: true,
          addressLine1: true,
          status: true,
          published: true,
          cancellationPolicy: true,
          cancellationWindowHours: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, method: true, displayLabel: true },
      },
      review: { select: { id: true, rating: true, comment: true } },
    },
  });

  const now = Date.now();
  return {
    upcoming: bookings
      .filter((b) => ["PENDING_PAYMENT", "CONFIRMED"].includes(b.status) && b.startAt.getTime() >= now)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
    past: bookings.filter(
      (b) =>
        b.status === "COMPLETED" ||
        b.status === "NO_SHOW" ||
        (["CONFIRMED"].includes(b.status) && b.startAt.getTime() < now),
    ),
    cancelled: bookings.filter((b) => ["CANCELLED", "EXPIRED", "REJECTED"].includes(b.status)),
  };
}

export type CustomerBooking = Awaited<ReturnType<typeof getCustomerBookings>>["upcoming"][number];
