import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Release lapsed payment holds.
 *
 * A slot held for payment is genuinely occupied — its assignment rows are
 * active, so the exclusion constraints keep anyone else out. When the hold
 * lapses those rows must be deactivated or the slot stays blocked forever.
 *
 * This runs lazily, at the start of every availability read and inside the
 * booking transaction, rather than on a timer. That keeps the guarantee true
 * even if a background worker is not running, which matters because the
 * database constraint — not the sweep — is what prevents double booking.
 */
export async function expireStaleHolds(
  tx: Prisma.TransactionClient = prisma,
  now = new Date(),
): Promise<number> {
  const stale = await tx.booking.findMany({
    where: { status: "PENDING_PAYMENT", holdExpiresAt: { lt: now } },
    select: { id: true, status: true },
  });

  if (stale.length === 0) return 0;
  const ids = stale.map((b) => b.id);

  await tx.booking.updateMany({
    where: { id: { in: ids } },
    data: { status: "EXPIRED", holdExpiresAt: null },
  });

  await tx.bookingStaffAssignment.updateMany({
    where: { bookingId: { in: ids } },
    data: { active: false },
  });

  await tx.bookingResourceAssignment.updateMany({
    where: { bookingId: { in: ids } },
    data: { active: false },
  });

  await tx.payment.updateMany({
    where: { bookingId: { in: ids }, status: { in: ["PENDING", "AUTHORIZED"] } },
    data: { status: "CANCELLED" },
  });

  await tx.bookingStatusHistory.createMany({
    data: ids.map((bookingId) => ({
      bookingId,
      fromStatus: "PENDING_PAYMENT" as const,
      toStatus: "EXPIRED" as const,
      actorRole: "SYSTEM" as const,
      reason: "Payment hold expired",
    })),
  });

  return ids.length;
}

/** Statuses whose assignment rows occupy the calendar. */
export const OCCUPYING_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "COMPLETED"] as const;
