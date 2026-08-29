import "server-only";

import type { NotificationChannel, NotificationEvent } from "@prisma/client";

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { formatMoneyShort } from "@/lib/money";
import { zonedParts, minutesToLabel } from "@/lib/time";
import { getTransport } from "@/lib/notifications/transport";

/**
 * Notifications.
 *
 * Composition and delivery are separate. Every message is persisted first so
 * that it is auditable and re-sendable, then handed to a transport. In this
 * build the transport is a mock that records the attempt; swapping in a real
 * LINE or email provider is a change to `transport.ts` alone.
 */

export interface NotificationInput {
  event: NotificationEvent;
  userId?: string | null;
  providerId?: string | null;
  channels?: NotificationChannel[];
  toAddress?: string | null;
  subject: string;
  body: string;
  payload?: Record<string, unknown>;
}

export async function send(input: NotificationInput): Promise<void> {
  const channels = input.channels ?? defaultChannels(input);
  const transport = getTransport();

  for (const channel of channels) {
    const record = await prisma.notification.create({
      data: {
        event: input.event,
        channel,
        userId: input.userId ?? null,
        providerId: input.providerId ?? null,
        toAddress: input.toAddress ?? null,
        subject: input.subject,
        body: input.body,
        payload: input.payload ? (input.payload as object) : undefined,
        status: "PENDING",
      },
    });

    try {
      const result = await transport.deliver({
        channel,
        to: input.toAddress ?? null,
        subject: input.subject,
        body: input.body,
      });
      await prisma.notification.update({
        where: { id: record.id },
        data: result.skipped
          ? { status: "SKIPPED", errorMessage: result.reason ?? null }
          : { status: "SENT", sentAt: new Date() },
      });
    } catch (error) {
      await prisma.notification.update({
        where: { id: record.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Delivery failed",
        },
      });
    }
  }
}

function defaultChannels(input: NotificationInput): NotificationChannel[] {
  return input.toAddress ? ["EMAIL", "IN_APP"] : ["IN_APP"];
}

async function bookingContext(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      reference: true,
      startAt: true,
      timezone: true,
      priceMinor: true,
      currency: true,
      customerId: true,
      customerEmail: true,
      customerName: true,
      providerId: true,
      provider: { select: { name: true, email: true } },
      service: { select: { name: true } },
    },
  });
}

function whenLabel(startAt: Date, timezone: string): string {
  const p = zonedParts(startAt, timezone);
  return `${p.dateKey} at ${minutesToLabel(p.minutes)}`;
}

/**
 * Event helpers. Booking and clinic code calls these rather than composing
 * message bodies inline, so wording stays consistent across the product.
 */
export const notify = {
  async bookingCreated(bookingId: string): Promise<void> {
    const b = await bookingContext(bookingId);
    if (!b) return;
    await send({
      event: "BOOKING_CREATED",
      userId: b.customerId,
      toAddress: b.customerEmail,
      subject: `We're holding your appointment · ${b.reference}`,
      body: `Your ${b.service.name} at ${b.provider.name} on ${whenLabel(b.startAt, b.timezone)} is held while you complete payment. The hold lasts ${config.booking.holdMinutes} minutes.`,
      payload: { bookingId: b.id, reference: b.reference },
    });
  },

  async bookingConfirmed(bookingId: string): Promise<void> {
    const b = await bookingContext(bookingId);
    if (!b) return;
    await send({
      event: "BOOKING_CONFIRMED",
      userId: b.customerId,
      toAddress: b.customerEmail,
      subject: `Appointment confirmed · ${b.reference}`,
      body: `Your ${b.service.name} at ${b.provider.name} is confirmed for ${whenLabel(b.startAt, b.timezone)}. Total ${formatMoneyShort(b.priceMinor, b.currency)}.`,
      payload: { bookingId: b.id, reference: b.reference },
    });
    await send({
      event: "BOOKING_CONFIRMED",
      providerId: b.providerId,
      toAddress: b.provider.email,
      subject: `New booking · ${b.reference}`,
      body: `${b.customerName} booked ${b.service.name} for ${whenLabel(b.startAt, b.timezone)}.`,
      payload: { bookingId: b.id },
    });
  },

  async bookingCancelled(bookingId: string, reason?: string): Promise<void> {
    const b = await bookingContext(bookingId);
    if (!b) return;
    await send({
      event: "BOOKING_CANCELLED",
      userId: b.customerId,
      toAddress: b.customerEmail,
      subject: `Appointment cancelled · ${b.reference}`,
      body: `Your ${b.service.name} at ${b.provider.name} on ${whenLabel(b.startAt, b.timezone)} has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
      payload: { bookingId: b.id },
    });
    await send({
      event: "BOOKING_CANCELLED",
      providerId: b.providerId,
      toAddress: b.provider.email,
      subject: `Booking cancelled · ${b.reference}`,
      body: `${b.customerName}'s ${b.service.name} on ${whenLabel(b.startAt, b.timezone)} was cancelled.`,
      payload: { bookingId: b.id },
    });
  },

  async bookingRescheduled(bookingId: string): Promise<void> {
    const b = await bookingContext(bookingId);
    if (!b) return;
    await send({
      event: "BOOKING_RESCHEDULED",
      userId: b.customerId,
      toAddress: b.customerEmail,
      subject: `Appointment moved · ${b.reference}`,
      body: `Your ${b.service.name} at ${b.provider.name} is now on ${whenLabel(b.startAt, b.timezone)}.`,
      payload: { bookingId: b.id },
    });
  },

  async paymentSucceeded(bookingId: string): Promise<void> {
    const b = await bookingContext(bookingId);
    if (!b) return;
    await send({
      event: "PAYMENT_SUCCESS",
      userId: b.customerId,
      toAddress: b.customerEmail,
      subject: `Payment received · ${b.reference}`,
      body: `We received ${formatMoneyShort(b.priceMinor, b.currency)} for ${b.service.name} at ${b.provider.name}. This is a demo environment — no real money was charged.`,
      payload: { bookingId: b.id },
    });
  },

  async paymentFailed(bookingId: string, reason: string): Promise<void> {
    const b = await bookingContext(bookingId);
    if (!b) return;
    await send({
      event: "PAYMENT_FAILED",
      userId: b.customerId,
      toAddress: b.customerEmail,
      subject: `Payment could not be completed · ${b.reference}`,
      body: `We could not complete the payment for ${b.service.name}. ${reason}`,
      payload: { bookingId: b.id },
    });
  },

  async clinicDecision(
    providerId: string,
    decision: "CLINIC_APPROVED" | "CLINIC_REJECTED" | "CLINIC_CHANGES_REQUESTED" | "CLINIC_SUSPENDED",
    note?: string,
  ): Promise<void> {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        email: true,
        members: { where: { role: "CLINIC_ADMIN" }, select: { id: true, email: true }, take: 1 },
      },
    });
    if (!provider) return;

    const copy: Record<typeof decision, { subject: string; body: string }> = {
      CLINIC_APPROVED: {
        subject: `${provider.name} is approved`,
        body: "Your clinic has been approved. You can now publish your profile and start taking bookings.",
      },
      CLINIC_REJECTED: {
        subject: `Your Suay application was not approved`,
        body: `We were unable to approve ${provider.name} at this time.${note ? ` ${note}` : ""} You can update your details and submit again.`,
      },
      CLINIC_CHANGES_REQUESTED: {
        subject: `More information needed for ${provider.name}`,
        body: `Before we can approve your clinic we need a few changes.${note ? ` ${note}` : ""}`,
      },
      CLINIC_SUSPENDED: {
        subject: `${provider.name} has been suspended`,
        body: `Your clinic has been suspended and is no longer listed.${note ? ` ${note}` : ""} Please contact Suay support.`,
      },
    };

    await send({
      event: decision,
      providerId: provider.id,
      userId: provider.members[0]?.id ?? null,
      toAddress: provider.members[0]?.email ?? provider.email,
      subject: copy[decision].subject,
      body: copy[decision].body,
      payload: { providerId: provider.id, note: note ?? null },
    });
  },
};
