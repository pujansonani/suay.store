import "server-only";

import type { ActorRole, AttributionSource, BookingChannel, Prisma } from "@prisma/client";

import { prisma, isExclusionViolation } from "@/lib/db";
import { getPolicy } from "@/lib/config";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  SlotUnavailableError,
  ValidationError,
} from "@/lib/errors";
import { bookingReference } from "@/lib/utils";
import { resolveSlot } from "@/lib/booking/availability";
import { expireStaleHolds } from "@/lib/booking/holds";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications/service";

export interface CreateBookingInput {
  providerId: string;
  serviceId: string;
  startAt: Date;
  staffId?: string | null;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerNote?: string | null;
  channel?: BookingChannel;
  attributionSource?: AttributionSource;
  landingPath?: string | null;
  referrer?: string | null;
  /** Provider-entered bookings skip the payment hold and confirm immediately. */
  confirmImmediately?: boolean;
  actorId?: string | null;
  actorRole?: ActorRole;
}

export interface CreatedBooking {
  id: string;
  reference: string;
  status: string;
  startAt: Date;
  endAt: Date;
  holdExpiresAt: Date | null;
  priceMinor: number;
  currency: string;
}

/**
 * Create a booking.
 *
 * Availability is recomputed inside the transaction — the times the browser
 * was shown are a hint, never a reservation. Even so, two requests can pass
 * that check simultaneously; the exclusion constraints on the assignment
 * tables are what actually decide, and the loser is told the slot is gone.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreatedBooking> {
  const policy = await getPolicy();

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, providerId: input.providerId, active: true },
    select: { id: true, name: true, priceMinor: true, currency: true, providerId: true },
  });
  if (!service) throw new NotFoundError("This treatment is not available.");

  const provider = await prisma.provider.findUnique({
    where: { id: input.providerId },
    select: { id: true, name: true, status: true, published: true, timezone: true },
  });
  if (!provider) throw new NotFoundError("Clinic not found.");

  const isProviderEntered = (input.channel ?? "MARKETPLACE") !== "MARKETPLACE";

  // Customers can only book clinics that are live on the marketplace. Staff
  // entering a walk-in can still record one for their own approved clinic.
  if (!isProviderEntered && (provider.status !== "APPROVED" || !provider.published)) {
    throw new ForbiddenError("This clinic is not accepting online bookings right now.");
  }
  if (isProviderEntered && provider.status !== "APPROVED") {
    throw new ForbiddenError("This clinic is not able to take bookings right now.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await expireStaleHolds(tx);

      const slot = await resolveSlot({
        providerId: input.providerId,
        serviceId: input.serviceId,
        startAt: input.startAt,
        staffId: input.staffId ?? null,
        ignoreMinNotice: isProviderEntered,
        tx,
      });

      if (!slot) throw new SlotUnavailableError();

      const providerCustomer = await upsertProviderCustomer(tx, {
        providerId: input.providerId,
        userId: input.customerId ?? null,
        name: input.customerName,
        email: input.customerEmail ?? null,
        phone: input.customerPhone ?? null,
      });

      const priorBookings = input.customerId
        ? await tx.booking.count({
            where: {
              providerId: input.providerId,
              customerId: input.customerId,
              status: { in: ["CONFIRMED", "COMPLETED"] },
            },
          })
        : 0;

      const confirmNow = input.confirmImmediately ?? false;
      const holdExpiresAt = confirmNow
        ? null
        : new Date(Date.now() + policy.holdMinutes * 60_000);

      const booking = await tx.booking.create({
        data: {
          reference: bookingReference(),
          providerId: input.providerId,
          serviceId: input.serviceId,
          customerId: input.customerId ?? null,
          providerCustomerId: providerCustomer.id,
          staffId: slot.staffId,
          status: confirmNow ? "CONFIRMED" : "PENDING_PAYMENT",
          channel: input.channel ?? "MARKETPLACE",
          startAt: slot.startAt,
          endAt: slot.endAt,
          blockStartAt: slot.blockStartAt,
          blockEndAt: slot.blockEndAt,
          durationMinutes: slot.durationMinutes,
          timezone: provider.timezone,
          priceMinor: service.priceMinor,
          currency: service.currency,
          holdExpiresAt,
          confirmedAt: confirmNow ? new Date() : null,
          customerName: input.customerName,
          customerEmail: input.customerEmail ?? null,
          customerPhone: input.customerPhone ?? null,
          customerNote: input.customerNote ?? null,
        },
      });

      // Occupancy rows. These are the ones the database refuses to overlap.
      if (slot.staffId) {
        await tx.bookingStaffAssignment.create({
          data: {
            bookingId: booking.id,
            staffId: slot.staffId,
            blockStartAt: slot.blockStartAt,
            blockEndAt: slot.blockEndAt,
          },
        });
      }

      for (const resourceId of slot.resourceIds) {
        await tx.bookingResourceAssignment.create({
          data: {
            bookingId: booking.id,
            resourceId,
            blockStartAt: slot.blockStartAt,
            blockEndAt: slot.blockEndAt,
          },
        });
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          toStatus: booking.status,
          actorId: input.actorId ?? input.customerId ?? null,
          actorRole: input.actorRole ?? (isProviderEntered ? "PROVIDER" : "CUSTOMER"),
          reason: confirmNow ? "Created by clinic" : "Slot held for payment",
        },
      });

      await tx.bookingAttribution.create({
        data: {
          bookingId: booking.id,
          source:
            input.attributionSource ??
            (isProviderEntered
              ? "PROVIDER_MANUAL"
              : priorBookings > 0
                ? "RETURNING_CUSTOMER"
                : "MARKETPLACE_DISCOVERY"),
          referrer: input.referrer ?? null,
          landingPath: input.landingPath ?? null,
          isFirstBookingWithProvider: priorBookings === 0,
        },
      });

      await recordAudit(
        {
          action: "booking.created",
          entityType: "Booking",
          entityId: booking.id,
          providerId: input.providerId,
          actorId: input.actorId ?? input.customerId ?? null,
          actorRole: input.actorRole ?? (isProviderEntered ? "PROVIDER" : "CUSTOMER"),
          summary: `${service.name} · ${booking.reference}`,
          metadata: { channel: booking.channel, startAt: booking.startAt.toISOString() },
        },
        tx,
      );

      return {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        startAt: booking.startAt,
        endAt: booking.endAt,
        holdExpiresAt: booking.holdExpiresAt,
        priceMinor: booking.priceMinor,
        currency: booking.currency,
      };
    });
  } catch (error) {
    // Lost the race with a concurrent booking for the same practitioner,
    // room or device.
    if (isExclusionViolation(error)) throw new SlotUnavailableError();
    throw error;
  }
}

async function upsertProviderCustomer(
  tx: Prisma.TransactionClient,
  input: {
    providerId: string;
    userId: string | null;
    name: string;
    email: string | null;
    phone: string | null;
  },
) {
  if (input.userId) {
    const existing = await tx.providerCustomer.findUnique({
      where: { providerId_userId: { providerId: input.providerId, userId: input.userId } },
    });
    if (existing) {
      return tx.providerCustomer.update({
        where: { id: existing.id },
        data: {
          name: input.name || existing.name,
          email: input.email ?? existing.email,
          phone: input.phone ?? existing.phone,
        },
      });
    }
    return tx.providerCustomer.create({
      data: {
        providerId: input.providerId,
        userId: input.userId,
        name: input.name,
        email: input.email,
        phone: input.phone,
      },
    });
  }

  const match = input.email
    ? await tx.providerCustomer.findFirst({
        where: { providerId: input.providerId, email: input.email },
      })
    : input.phone
      ? await tx.providerCustomer.findFirst({
          where: { providerId: input.providerId, phone: input.phone },
        })
      : null;

  if (match) return match;

  return tx.providerCustomer.create({
    data: {
      providerId: input.providerId,
      name: input.name,
      email: input.email,
      phone: input.phone,
    },
  });
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

export async function confirmBooking(
  bookingId: string,
  options: { actorId?: string | null; actorRole?: ActorRole; reason?: string } = {},
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, holdExpiresAt: true, providerId: true, customerId: true },
    });
    if (!booking) throw new NotFoundError("Booking not found.");
    if (booking.status === "CONFIRMED") return;
    if (booking.status !== "PENDING_PAYMENT") {
      throw new ConflictError("This booking can no longer be confirmed.");
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED", confirmedAt: new Date(), holdExpiresAt: null },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: "PENDING_PAYMENT",
        toStatus: "CONFIRMED",
        actorId: options.actorId ?? null,
        actorRole: options.actorRole ?? "SYSTEM",
        reason: options.reason ?? "Payment captured",
      },
    });
  });

  await notify.bookingConfirmed(bookingId);
}

export interface CancelInput {
  bookingId: string;
  actorId: string | null;
  actorRole: ActorRole;
  reason?: string;
  /** Tenant guard for clinic callers. */
  providerId?: string;
  /** Ownership guard for customer callers. */
  customerId?: string;
}

export async function cancelBooking(input: CancelInput): Promise<void> {
  const policy = await getPolicy();

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      select: {
        id: true,
        status: true,
        providerId: true,
        customerId: true,
        startAt: true,
        reference: true,
      },
    });
    if (!booking) throw new NotFoundError("Booking not found.");

    // Scope checks happen here, against the stored row, using ids taken from
    // the session — not from the request.
    if (input.providerId && booking.providerId !== input.providerId) {
      throw new ForbiddenError("You do not have access to this booking.");
    }
    if (input.customerId && booking.customerId !== input.customerId) {
      throw new ForbiddenError("You do not have access to this booking.");
    }

    if (["CANCELLED", "COMPLETED", "EXPIRED", "NO_SHOW"].includes(booking.status)) {
      throw new ConflictError("This appointment can no longer be cancelled.");
    }

    if (input.actorRole === "CUSTOMER") {
      const hoursUntil = (booking.startAt.getTime() - Date.now()) / 3_600_000;
      if (hoursUntil < 0) {
        throw new ConflictError("This appointment has already taken place.");
      }
      // A late cancellation is still allowed; policy decides the fee, which is
      // surfaced to the customer rather than enforced by blocking them.
      void policy.cancellationFreeHours;
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: input.actorId,
        cancelledByRole: input.actorRole,
        cancelReason: input.reason ?? null,
        holdExpiresAt: null,
      },
    });

    // Release the practitioner, room and equipment back to the calendar
    // without deleting the history of what was booked.
    await tx.bookingStaffAssignment.updateMany({
      where: { bookingId: booking.id },
      data: { active: false },
    });
    await tx.bookingResourceAssignment.updateMany({
      where: { bookingId: booking.id },
      data: { active: false },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: "CANCELLED",
        actorId: input.actorId,
        actorRole: input.actorRole,
        reason: input.reason,
      },
    });

    await recordAudit(
      {
        action: "booking.cancelled",
        entityType: "Booking",
        entityId: booking.id,
        providerId: booking.providerId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        summary: `${booking.reference} cancelled`,
        metadata: { reason: input.reason ?? null },
      },
      tx,
    );
  });

  await notify.bookingCancelled(input.bookingId, input.reason);
}

export interface RescheduleInput {
  bookingId: string;
  startAt: Date;
  staffId?: string | null;
  actorId: string | null;
  actorRole: ActorRole;
  providerId?: string;
  customerId?: string;
  reason?: string;
}

/**
 * Move an appointment.
 *
 * Availability is recalculated from scratch against the practitioner, room and
 * equipment — the old time is simply released, never carried over. The
 * booking's own occupancy is excluded so it does not block itself.
 */
export async function rescheduleBooking(input: RescheduleInput): Promise<void> {
  const policy = await getPolicy();

  try {
    await prisma.$transaction(async (tx) => {
      await expireStaleHolds(tx);

      const booking = await tx.booking.findUnique({
        where: { id: input.bookingId },
        select: {
          id: true,
          status: true,
          providerId: true,
          customerId: true,
          serviceId: true,
          startAt: true,
          reference: true,
          rescheduleCount: true,
        },
      });
      if (!booking) throw new NotFoundError("Booking not found.");

      if (input.providerId && booking.providerId !== input.providerId) {
        throw new ForbiddenError("You do not have access to this booking.");
      }
      if (input.customerId && booking.customerId !== input.customerId) {
        throw new ForbiddenError("You do not have access to this booking.");
      }

      if (!["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status)) {
        throw new ConflictError("This appointment can no longer be rescheduled.");
      }

      if (input.actorRole === "CUSTOMER") {
        if (!policy.allowCustomerReschedule) {
          throw new ForbiddenError("Please contact the clinic to change this appointment.");
        }
        if (booking.rescheduleCount >= policy.maxReschedulesPerBooking) {
          throw new ConflictError(
            "This appointment has been rescheduled the maximum number of times. Please contact the clinic.",
          );
        }
      }

      const slot = await resolveSlot({
        providerId: booking.providerId,
        serviceId: booking.serviceId,
        startAt: input.startAt,
        staffId: input.staffId ?? null,
        excludeBookingId: booking.id,
        ignoreMinNotice: input.actorRole !== "CUSTOMER",
        tx,
      });
      if (!slot) throw new SlotUnavailableError();

      // Drop the previous occupancy, then claim the new one.
      await tx.bookingStaffAssignment.deleteMany({ where: { bookingId: booking.id } });
      await tx.bookingResourceAssignment.deleteMany({ where: { bookingId: booking.id } });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          startAt: slot.startAt,
          endAt: slot.endAt,
          blockStartAt: slot.blockStartAt,
          blockEndAt: slot.blockEndAt,
          staffId: slot.staffId,
          rescheduleCount: { increment: 1 },
          rescheduledFromId: booking.id,
        },
      });

      if (slot.staffId) {
        await tx.bookingStaffAssignment.create({
          data: {
            bookingId: booking.id,
            staffId: slot.staffId,
            blockStartAt: slot.blockStartAt,
            blockEndAt: slot.blockEndAt,
          },
        });
      }
      for (const resourceId of slot.resourceIds) {
        await tx.bookingResourceAssignment.create({
          data: {
            bookingId: booking.id,
            resourceId,
            blockStartAt: slot.blockStartAt,
            blockEndAt: slot.blockEndAt,
          },
        });
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: booking.status,
          actorId: input.actorId,
          actorRole: input.actorRole,
          reason: input.reason ?? "Rescheduled",
          metadata: {
            from: booking.startAt.toISOString(),
            to: slot.startAt.toISOString(),
          },
        },
      });

      await recordAudit(
        {
          action: "booking.rescheduled",
          entityType: "Booking",
          entityId: booking.id,
          providerId: booking.providerId,
          actorId: input.actorId,
          actorRole: input.actorRole,
          summary: `${booking.reference} moved`,
          metadata: { from: booking.startAt.toISOString(), to: slot.startAt.toISOString() },
        },
        tx,
      );
    });
  } catch (error) {
    if (isExclusionViolation(error)) throw new SlotUnavailableError();
    throw error;
  }

  await notify.bookingRescheduled(input.bookingId);
}

export async function setBookingOutcome(input: {
  bookingId: string;
  providerId: string;
  outcome: "COMPLETED" | "NO_SHOW";
  actorId: string;
  actorRole: ActorRole;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: input.bookingId, providerId: input.providerId },
      select: { id: true, status: true, startAt: true, providerId: true, reference: true },
    });
    if (!booking) throw new ForbiddenError("You do not have access to this booking.");
    if (booking.status !== "CONFIRMED") {
      throw new ConflictError("Only confirmed appointments can be marked complete.");
    }
    if (booking.startAt.getTime() > Date.now()) {
      throw new ValidationError("This appointment has not happened yet.");
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: input.outcome,
        completedAt: input.outcome === "COMPLETED" ? new Date() : null,
      },
    });

    if (input.outcome === "NO_SHOW") {
      await tx.bookingStaffAssignment.updateMany({
        where: { bookingId: booking.id },
        data: { active: false },
      });
      await tx.bookingResourceAssignment.updateMany({
        where: { bookingId: booking.id },
        data: { active: false },
      });
    }

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: "CONFIRMED",
        toStatus: input.outcome,
        actorId: input.actorId,
        actorRole: input.actorRole,
      },
    });

    await recordAudit(
      {
        action: input.outcome === "COMPLETED" ? "booking.completed" : "booking.no_show",
        entityType: "Booking",
        entityId: booking.id,
        providerId: booking.providerId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        summary: booking.reference,
      },
      tx,
    );
  });
}
