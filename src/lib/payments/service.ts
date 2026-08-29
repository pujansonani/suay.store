import "server-only";

import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ConflictError, ForbiddenError, HoldExpiredError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";
import { confirmBooking } from "@/lib/booking/service";
import { notify } from "@/lib/notifications/service";
import { getPaymentGateway } from "@/lib/payments/registry";
import type { GatewayChargeStatus } from "@/lib/payments/gateway";

/**
 * Payment orchestration.
 *
 * Booking state and payment state are deliberately separate: a booking is
 * PENDING_PAYMENT or CONFIRMED, a payment is AUTHORIZED or CAPTURED. The link
 * between them is one-directional — a captured payment confirms its booking —
 * so a payment problem never leaves a booking in an undefined state.
 */

export interface StartPaymentInput {
  bookingId: string;
  customerId: string;
  method: PaymentMethod;
  simulate?: "success" | "decline" | "pending";
}

export interface StartPaymentResult {
  paymentId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  qrPayload: string | null;
  displayLabel: string | null;
  amountMinor: number;
  currency: string;
  failureMessage: string | null;
  /** True when the booking is confirmed and the customer can be sent onward. */
  completed: boolean;
}

export async function startPayment(input: StartPaymentInput): Promise<StartPaymentResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      reference: true,
      status: true,
      holdExpiresAt: true,
      customerId: true,
      providerId: true,
      priceMinor: true,
      currency: true,
      customerName: true,
      customerEmail: true,
      service: { select: { name: true } },
    },
  });

  if (!booking) throw new NotFoundError("Booking not found.");
  if (booking.customerId !== input.customerId) {
    throw new ForbiddenError("You do not have access to this booking.");
  }
  if (booking.status === "CONFIRMED") {
    throw new ConflictError("This appointment is already confirmed.");
  }
  if (booking.status !== "PENDING_PAYMENT") {
    throw new ConflictError("This booking is no longer awaiting payment.");
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() < Date.now()) {
    throw new HoldExpiredError();
  }

  if (input.method === "PAY_AT_CLINIC") {
    throw new ConflictError("Paying at the clinic is not available for this treatment.");
  }

  const gateway = getPaymentGateway();

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      providerId: booking.providerId,
      gateway: gateway.name,
      method: input.method,
      status: "PENDING",
      amountMinor: booking.priceMinor,
      currency: booking.currency,
    },
  });

  const charge = await gateway.createCharge({
    amountMinor: booking.priceMinor,
    currency: booking.currency,
    method: input.method === "PROMPTPAY" ? "PROMPTPAY" : "CARD",
    reference: booking.reference,
    description: `${booking.service.name} · ${booking.reference}`,
    customer: { name: booking.customerName, email: booking.customerEmail },
    simulate: input.simulate,
    metadata: { bookingId: booking.id },
  });

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      externalChargeId: charge.externalChargeId,
      status: mapGatewayStatus(charge.status),
      displayLabel: charge.displayLabel ?? null,
      qrPayload: charge.qrPayload ?? null,
      failureCode: charge.failureCode ?? null,
      failureMessage: charge.failureMessage ?? null,
      authorizedAt: charge.status === "AUTHORIZED" ? new Date() : null,
      failedAt: charge.status === "FAILED" ? new Date() : null,
    },
  });

  if (charge.status === "FAILED") {
    await notify.paymentFailed(booking.id, charge.failureMessage ?? "Please try another method.");
    return {
      paymentId: updated.id,
      status: updated.status,
      method: updated.method,
      qrPayload: null,
      displayLabel: null,
      amountMinor: updated.amountMinor,
      currency: updated.currency,
      failureMessage: charge.failureMessage ?? "The payment could not be completed.",
      completed: false,
    };
  }

  // A card authorisation is captured straight away in this build. A real
  // deployment might hold the authorisation until the clinic accepts.
  if (charge.status === "AUTHORIZED") {
    await capturePayment(updated.id);
    return {
      paymentId: updated.id,
      status: "CAPTURED",
      method: updated.method,
      qrPayload: null,
      displayLabel: updated.displayLabel,
      amountMinor: updated.amountMinor,
      currency: updated.currency,
      failureMessage: null,
      completed: true,
    };
  }

  // PromptPay: the customer scans, then the gateway calls our webhook.
  return {
    paymentId: updated.id,
    status: updated.status,
    method: updated.method,
    qrPayload: updated.qrPayload,
    displayLabel: updated.displayLabel,
    amountMinor: updated.amountMinor,
    currency: updated.currency,
    failureMessage: null,
    completed: false,
  };
}

export async function capturePayment(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      amountMinor: true,
      externalChargeId: true,
      bookingId: true,
      providerId: true,
    },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (payment.status === "CAPTURED") return;

  const gateway = getPaymentGateway();
  const result = await gateway.capture(payment.externalChargeId ?? "", payment.amountMinor);

  if (result.status !== "CAPTURED") {
    await markPaymentFailed(payment.id, result.failureMessage ?? "Capture failed");
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "CAPTURED",
      capturedAmountMinor: result.capturedAmountMinor,
      capturedAt: new Date(),
    },
  });

  await recordAudit({
    action: "payment.state_changed",
    entityType: "Payment",
    entityId: payment.id,
    providerId: payment.providerId,
    actorRole: "SYSTEM",
    summary: "Payment captured",
    metadata: { bookingId: payment.bookingId, amountMinor: result.capturedAmountMinor },
  });

  await confirmBooking(payment.bookingId, { actorRole: "SYSTEM", reason: "Payment captured" });
  await notify.paymentSucceeded(payment.bookingId);
}

export async function markPaymentFailed(paymentId: string, message: string): Promise<void> {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "FAILED", failedAt: new Date(), failureMessage: message },
    select: { bookingId: true, providerId: true, id: true },
  });

  await recordAudit({
    action: "payment.state_changed",
    entityType: "Payment",
    entityId: payment.id,
    providerId: payment.providerId,
    actorRole: "SYSTEM",
    summary: `Payment failed: ${message}`,
  });

  await notify.paymentFailed(payment.bookingId, message);
}

export async function refundPayment(input: {
  paymentId: string;
  amountMinor?: number;
  actorId: string;
  actorRole: "ADMIN" | "PROVIDER";
  reason?: string;
}): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    select: {
      id: true,
      status: true,
      capturedAmountMinor: true,
      refundedAmountMinor: true,
      externalChargeId: true,
      providerId: true,
      bookingId: true,
    },
  });
  if (!payment) throw new NotFoundError("Payment not found.");
  if (payment.status !== "CAPTURED" && payment.status !== "PARTIALLY_REFUNDED") {
    throw new ConflictError("Only a captured payment can be refunded.");
  }

  const remaining = payment.capturedAmountMinor - payment.refundedAmountMinor;
  const amount = Math.min(input.amountMinor ?? remaining, remaining);
  if (amount <= 0) throw new ConflictError("This payment has already been fully refunded.");

  const gateway = getPaymentGateway();
  const result = await gateway.refund(payment.externalChargeId ?? "", amount);
  if (result.status === "FAILED") {
    throw new ConflictError(result.failureMessage ?? "The refund could not be processed.");
  }

  const refundedTotal = payment.refundedAmountMinor + result.refundedAmountMinor;
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      refundedAmountMinor: refundedTotal,
      status: refundedTotal >= payment.capturedAmountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED",
      refundedAt: new Date(),
    },
  });

  await recordAudit({
    action: "payment.refunded",
    entityType: "Payment",
    entityId: payment.id,
    providerId: payment.providerId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    summary: `Refunded ${amount / 100}`,
    metadata: { bookingId: payment.bookingId, amountMinor: amount, reason: input.reason ?? null },
  });
}

/**
 * Apply a gateway webhook.
 *
 * Idempotency is enforced by a unique key on (gateway, externalEventId): a
 * replayed event is recorded once and applied once. A duplicate delivery is a
 * no-op rather than a second capture.
 */
export async function handleWebhookEvent(rawBody: string, signature: string | null): Promise<{
  applied: boolean;
  reason?: string;
}> {
  const gateway = getPaymentGateway();

  if (!gateway.verifyWebhook(rawBody, signature)) {
    throw new ForbiddenError("Invalid webhook signature.");
  }

  const event = gateway.parseWebhook(rawBody);

  const payment = await prisma.payment.findFirst({
    where: { externalChargeId: event.externalChargeId },
    select: { id: true, status: true, bookingId: true, amountMinor: true },
  });

  let stored;
  try {
    stored = await prisma.paymentEvent.create({
      data: {
        gateway: gateway.name,
        externalEventId: event.id,
        type: event.type,
        payload: event.raw as Prisma.InputJsonValue,
        paymentId: payment?.id ?? null,
      },
    });
  } catch {
    // Unique violation: this event has already been recorded and applied.
    return { applied: false, reason: "duplicate" };
  }

  if (!payment) {
    await prisma.paymentEvent.update({
      where: { id: stored.id },
      data: { processedAt: new Date(), processingError: "No matching payment" },
    });
    return { applied: false, reason: "unknown_charge" };
  }

  try {
    if (event.status === "CAPTURED" || event.status === "AUTHORIZED") {
      if (payment.status !== "CAPTURED") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "CAPTURED",
            capturedAmountMinor: event.amountMinor ?? payment.amountMinor,
            capturedAt: new Date(),
          },
        });
        await confirmBooking(payment.bookingId, {
          actorRole: "SYSTEM",
          reason: "Payment webhook",
        });
        await notify.paymentSucceeded(payment.bookingId);
      }
    } else if (event.status === "FAILED" || event.status === "CANCELLED") {
      if (payment.status !== "FAILED") {
        await markPaymentFailed(
          payment.id,
          event.failureMessage ?? "The payment was not completed.",
        );
      }
    }

    await prisma.paymentEvent.update({
      where: { id: stored.id },
      data: { processedAt: new Date() },
    });
    return { applied: true };
  } catch (error) {
    await prisma.paymentEvent.update({
      where: { id: stored.id },
      data: {
        processedAt: new Date(),
        processingError: error instanceof Error ? error.message : "Processing failed",
      },
    });
    throw error;
  }
}

function mapGatewayStatus(status: GatewayChargeStatus): PaymentStatus {
  switch (status) {
    case "AUTHORIZED":
      return "AUTHORIZED";
    case "CAPTURED":
      return "CAPTURED";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}
