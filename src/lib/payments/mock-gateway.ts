import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type {
  CaptureResult,
  ChargeRequest,
  ChargeResult,
  PaymentGateway,
  RefundResult,
  WebhookEvent,
} from "@/lib/payments/gateway";

/**
 * Development gateway.
 *
 * Simulates authorisation, capture, refund and signed webhooks entirely
 * locally. No credentials, no network calls, and no money — which is why the
 * checkout UI states plainly that the payment is a demo.
 *
 * Card behaviour is driven by the `simulate` field so that both the happy path
 * and the decline path can be demonstrated and tested deterministically.
 */
export class MockPaymentGateway implements PaymentGateway {
  readonly name = "mock";
  readonly supportedMethods = ["CARD", "PROMPTPAY"] as const;

  constructor(private readonly webhookSecret: string) {}

  async createCharge(request: ChargeRequest): Promise<ChargeResult> {
    const externalChargeId = `mock_ch_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

    if (request.simulate === "decline") {
      return {
        externalChargeId,
        status: "FAILED",
        failureCode: "card_declined",
        failureMessage: "The card was declined by the issuing bank.",
      };
    }

    if (request.method === "PROMPTPAY") {
      // Shaped like an EMVCo payload so the UI can render a realistic QR.
      // It is not a valid PromptPay code and cannot move money.
      return {
        externalChargeId,
        status: "PENDING",
        displayLabel: "PromptPay",
        qrPayload: `00020101021229370016A00000067701011201150000000000000005802TH53037645406${(
          request.amountMinor / 100
        ).toFixed(2)}6304DEMO`,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      };
    }

    return {
      externalChargeId,
      status: "AUTHORIZED",
      displayLabel: "•••• 4242",
    };
  }

  async capture(_externalChargeId: string, amountMinor: number): Promise<CaptureResult> {
    return { status: "CAPTURED", capturedAmountMinor: amountMinor };
  }

  async cancel(_externalChargeId: string): Promise<void> {
    // Nothing to release in the mock.
  }

  async refund(_externalChargeId: string, amountMinor: number): Promise<RefundResult> {
    return { refundedAmountMinor: amountMinor, status: "REFUNDED" };
  }

  /** Signature scheme mirrors what real providers do: HMAC over the raw body. */
  sign(rawBody: string): string {
    return createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
  }

  verifyWebhook(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    const expected = this.sign(rawBody);
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: string): WebhookEvent {
    const parsed = JSON.parse(rawBody) as {
      id?: string;
      type?: string;
      data?: {
        chargeId?: string;
        status?: string;
        amountMinor?: number;
        failureCode?: string;
        failureMessage?: string;
      };
    };

    return {
      id: parsed.id ?? randomUUID(),
      type: parsed.type ?? "charge.updated",
      externalChargeId: parsed.data?.chargeId ?? "",
      status: (parsed.data?.status ?? "PENDING") as WebhookEvent["status"],
      amountMinor: parsed.data?.amountMinor,
      failureCode: parsed.data?.failureCode,
      failureMessage: parsed.data?.failureMessage,
      raw: parsed,
    };
  }
}
