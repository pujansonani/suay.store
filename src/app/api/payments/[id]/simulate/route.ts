import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/guards";
import { config } from "@/lib/config";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { handleWebhookEvent } from "@/lib/payments/service";
import { getPaymentGateway, isMockGateway } from "@/lib/payments/registry";

/**
 * Demo helper for the PromptPay flow.
 *
 * Rather than short-circuiting to "paid", this builds a properly signed
 * webhook payload and pushes it through the real webhook handler — the same
 * code path a live gateway would trigger. That keeps the demo honest about
 * how the system actually works, including its idempotency.
 *
 * Only available while the mock gateway is in use.
 */
export const POST = handler(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireCustomer();
  const { id } = await context.params;

  const gateway = getPaymentGateway();
  if (!isMockGateway(gateway)) {
    throw new ForbiddenError("Payment simulation is only available with the mock gateway.");
  }

  const payment = await prisma.payment.findFirst({
    where: { id, booking: { customerId: user.id } },
    select: { id: true, externalChargeId: true, amountMinor: true, bookingId: true },
  });
  if (!payment) throw new NotFoundError("Payment not found.");

  const body = JSON.stringify({
    id: `mock_evt_${payment.id}`,
    type: "charge.captured",
    data: {
      chargeId: payment.externalChargeId,
      status: "CAPTURED",
      amountMinor: payment.amountMinor,
    },
  });

  const result = await handleWebhookEvent(body, gateway.sign(body));

  return ok({ ...result, demo: true, gateway: gateway.name, holdMinutes: config.booking.holdMinutes });
});
