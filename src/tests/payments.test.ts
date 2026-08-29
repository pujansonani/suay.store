import { beforeEach, describe, expect, it } from "vitest";

import { createBooking } from "@/lib/booking/service";
import { setPolicy } from "@/lib/config";
import { ConflictError, ForbiddenError, HoldExpiredError } from "@/lib/errors";
import { handleWebhookEvent, startPayment, refundPayment } from "@/lib/payments/service";
import { getPaymentGateway } from "@/lib/payments/registry";
import { MockPaymentGateway } from "@/lib/payments/mock-gateway";
import { bkk, dayKey, prisma, resetDatabase, seedFixture, type Fixture } from "./helpers";

let f: Fixture;
const TOMORROW = dayKey(1);

async function hold(minutes = 10 * 60) {
  return createBooking({
    providerId: f.providerId,
    serviceId: f.serviceId,
    startAt: bkk(TOMORROW, minutes),
    staffId: f.staffId,
    customerId: f.customerId,
    customerName: "Payer",
    customerEmail: "payer@test",
  });
}

beforeEach(async () => {
  await resetDatabase();
  f = await seedFixture();
  await setPolicy({ minNoticeMinutes: 0, slotIntervalMinutes: 30, holdMinutes: 10 });
});

describe("card payments", () => {
  it("captures a successful card payment and confirms the booking", async () => {
    const booking = await hold();

    const result = await startPayment({
      bookingId: booking.id,
      customerId: f.customerId,
      method: "CARD",
      simulate: "success",
    });

    expect(result.status).toBe("CAPTURED");
    expect(result.completed).toBe(true);

    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(after?.status).toBe("CONFIRMED");
    // The hold is cleared once the booking is confirmed.
    expect(after?.holdExpiresAt).toBeNull();
    expect(after?.confirmedAt).toBeInstanceOf(Date);
  });

  it("leaves the booking awaiting payment when the card is declined", async () => {
    const booking = await hold();

    const result = await startPayment({
      bookingId: booking.id,
      customerId: f.customerId,
      method: "CARD",
      simulate: "decline",
    });

    expect(result.status).toBe("FAILED");
    expect(result.completed).toBe(false);
    expect(result.failureMessage).toMatch(/declined/i);

    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    // The slot is still held, so the customer can retry without losing it.
    expect(after?.status).toBe("PENDING_PAYMENT");
  });

  it("keeps booking state and payment state separate", async () => {
    const booking = await hold();
    await startPayment({
      bookingId: booking.id,
      customerId: f.customerId,
      method: "CARD",
      simulate: "decline",
    });

    const payment = await prisma.payment.findFirst({ where: { bookingId: booking.id } });
    const record = await prisma.booking.findUnique({ where: { id: booking.id } });

    expect(payment?.status).toBe("FAILED");
    expect(record?.status).toBe("PENDING_PAYMENT");
  });

  it("stores no card data, only a display hint", async () => {
    const booking = await hold();
    await startPayment({
      bookingId: booking.id,
      customerId: f.customerId,
      method: "CARD",
      simulate: "success",
    });

    const payment = await prisma.payment.findFirst({ where: { bookingId: booking.id } });
    expect(payment?.displayLabel).toBe("•••• 4242");
    // Nothing resembling a full card number is retained.
    expect(JSON.stringify(payment)).not.toMatch(/\d{13,19}/);
  });
});

describe("payment ownership", () => {
  it("refuses to take payment for someone else's booking", async () => {
    const booking = await hold();
    await expect(
      startPayment({
        bookingId: booking.id,
        customerId: f.secondCustomerId,
        method: "CARD",
        simulate: "success",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses payment once the hold has expired", async () => {
    const booking = await hold();
    await prisma.booking.update({
      where: { id: booking.id },
      data: { holdExpiresAt: new Date(Date.now() - 1000) },
    });

    await expect(
      startPayment({
        bookingId: booking.id,
        customerId: f.customerId,
        method: "CARD",
        simulate: "success",
      }),
    ).rejects.toBeInstanceOf(HoldExpiredError);
  });

  it("refuses a second payment for a confirmed booking", async () => {
    const booking = await hold();
    await startPayment({
      bookingId: booking.id,
      customerId: f.customerId,
      method: "CARD",
      simulate: "success",
    });

    await expect(
      startPayment({
        bookingId: booking.id,
        customerId: f.customerId,
        method: "CARD",
        simulate: "success",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("PromptPay", () => {
  it("returns a QR payload and waits for the gateway callback", async () => {
    const booking = await hold(11 * 60);

    const result = await startPayment({
      bookingId: booking.id,
      customerId: f.customerId,
      method: "PROMPTPAY",
    });

    expect(result.status).toBe("PENDING");
    expect(result.completed).toBe(false);
    expect(result.qrPayload).toBeTruthy();

    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(after?.status).toBe("PENDING_PAYMENT");
  });
});

describe("webhooks", () => {
  function signed(body: object) {
    const gateway = getPaymentGateway() as MockPaymentGateway;
    const raw = JSON.stringify(body);
    return { raw, signature: gateway.sign(raw) };
  }

  it("rejects an unsigned webhook", async () => {
    const { raw } = signed({ id: "evt_1", type: "charge.captured", data: {} });
    await expect(handleWebhookEvent(raw, null)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects a webhook with a bad signature", async () => {
    const { raw } = signed({ id: "evt_1", type: "charge.captured", data: {} });
    await expect(handleWebhookEvent(raw, "0".repeat(64))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("confirms the booking on a captured event", async () => {
    const booking = await hold(12 * 60);
    await startPayment({ bookingId: booking.id, customerId: f.customerId, method: "PROMPTPAY" });
    const payment = await prisma.payment.findFirstOrThrow({ where: { bookingId: booking.id } });

    const { raw, signature } = signed({
      id: "evt_capture_1",
      type: "charge.captured",
      data: { chargeId: payment.externalChargeId, status: "CAPTURED", amountMinor: payment.amountMinor },
    });

    const result = await handleWebhookEvent(raw, signature);
    expect(result.applied).toBe(true);

    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(after?.status).toBe("CONFIRMED");
  });

  it("applies a repeated event only once", async () => {
    const booking = await hold(13 * 60);
    await startPayment({ bookingId: booking.id, customerId: f.customerId, method: "PROMPTPAY" });
    const payment = await prisma.payment.findFirstOrThrow({ where: { bookingId: booking.id } });

    const { raw, signature } = signed({
      id: "evt_capture_dupe",
      type: "charge.captured",
      data: { chargeId: payment.externalChargeId, status: "CAPTURED", amountMinor: payment.amountMinor },
    });

    const first = await handleWebhookEvent(raw, signature);
    const second = await handleWebhookEvent(raw, signature);
    const third = await handleWebhookEvent(raw, signature);

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.reason).toBe("duplicate");
    expect(third.applied).toBe(false);

    // Exactly one event row, and the amount was captured once.
    const events = await prisma.paymentEvent.count({ where: { externalEventId: "evt_capture_dupe" } });
    expect(events).toBe(1);

    const after = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after.capturedAmountMinor).toBe(payment.amountMinor);
  });

  it("records an event for an unknown charge without failing", async () => {
    const { raw, signature } = signed({
      id: "evt_unknown",
      type: "charge.captured",
      data: { chargeId: "mock_ch_does_not_exist", status: "CAPTURED" },
    });

    const result = await handleWebhookEvent(raw, signature);
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("unknown_charge");

    const stored = await prisma.paymentEvent.findFirst({ where: { externalEventId: "evt_unknown" } });
    expect(stored?.processingError).toBe("No matching payment");
  });

  it("marks the payment failed on a failure event", async () => {
    const booking = await hold(14 * 60);
    await startPayment({ bookingId: booking.id, customerId: f.customerId, method: "PROMPTPAY" });
    const payment = await prisma.payment.findFirstOrThrow({ where: { bookingId: booking.id } });

    const { raw, signature } = signed({
      id: "evt_fail_1",
      type: "charge.failed",
      data: {
        chargeId: payment.externalChargeId,
        status: "FAILED",
        failureMessage: "Insufficient funds",
      },
    });

    await handleWebhookEvent(raw, signature);

    const after = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after.status).toBe("FAILED");
    expect(after.failureMessage).toBe("Insufficient funds");
  });
});

describe("refunds", () => {
  it("refunds a captured payment in full", async () => {
    const booking = await hold(15 * 60);
    await startPayment({
      bookingId: booking.id,
      customerId: f.customerId,
      method: "CARD",
      simulate: "success",
    });
    const payment = await prisma.payment.findFirstOrThrow({ where: { bookingId: booking.id } });

    await refundPayment({ paymentId: payment.id, actorId: f.platformAdminId, actorRole: "ADMIN" });

    const after = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after.status).toBe("REFUNDED");
    expect(after.refundedAmountMinor).toBe(payment.capturedAmountMinor);
  });

  it("supports a partial refund", async () => {
    const booking = await hold(16 * 60);
    await startPayment({
      bookingId: booking.id,
      customerId: f.customerId,
      method: "CARD",
      simulate: "success",
    });
    const payment = await prisma.payment.findFirstOrThrow({ where: { bookingId: booking.id } });

    await refundPayment({
      paymentId: payment.id,
      amountMinor: 50000,
      actorId: f.platformAdminId,
      actorRole: "ADMIN",
    });

    const after = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after.status).toBe("PARTIALLY_REFUNDED");
    expect(after.refundedAmountMinor).toBe(50000);
  });

  it("refuses to refund an unpaid booking", async () => {
    const booking = await hold(17 * 60);
    await startPayment({ bookingId: booking.id, customerId: f.customerId, method: "PROMPTPAY" });
    const payment = await prisma.payment.findFirstOrThrow({ where: { bookingId: booking.id } });

    await expect(
      refundPayment({ paymentId: payment.id, actorId: f.platformAdminId, actorRole: "ADMIN" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("records every payment state change in the audit log", async () => {
    const booking = await hold(9 * 60);
    await startPayment({
      bookingId: booking.id,
      customerId: f.customerId,
      method: "CARD",
      simulate: "success",
    });

    const entries = await prisma.auditLog.findMany({
      where: { action: "payment.state_changed", providerId: f.providerId },
    });
    expect(entries.length).toBeGreaterThan(0);
  });
});
