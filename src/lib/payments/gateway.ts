/**
 * Payment gateway contract.
 *
 * Nothing in the application talks to a payment provider directly. Booking
 * code depends on this interface only, so adding Omise or 2C2P later is a new
 * file plus one line in the registry — not a change to the booking flow.
 *
 * No card data ever reaches this application or its database.
 */

export type GatewayChargeStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED";

export interface ChargeRequest {
  /** Minor units (satang). */
  amountMinor: number;
  currency: string;
  method: "CARD" | "PROMPTPAY";
  /** Our booking reference, passed through for reconciliation. */
  reference: string;
  description: string;
  customer?: { name?: string; email?: string | null };
  /**
   * Deterministic outcome for demos and tests, e.g. "decline" to simulate a
   * refused card. Real adapters ignore this.
   */
  simulate?: "success" | "decline" | "pending";
  metadata?: Record<string, string>;
}

export interface ChargeResult {
  externalChargeId: string;
  status: GatewayChargeStatus;
  /** Non-sensitive label for receipts, e.g. "•••• 4242". */
  displayLabel?: string;
  /** PromptPay payload the UI renders as a QR code. */
  qrPayload?: string;
  failureCode?: string;
  failureMessage?: string;
  /** For asynchronous methods: when the customer must have paid by. */
  expiresAt?: Date;
}

export interface CaptureResult {
  status: GatewayChargeStatus;
  capturedAmountMinor: number;
  failureCode?: string;
  failureMessage?: string;
}

export interface RefundResult {
  refundedAmountMinor: number;
  status: "REFUNDED" | "PARTIALLY_REFUNDED" | "FAILED";
  failureMessage?: string;
}

export interface WebhookEvent {
  /** Provider-side id. Used as the idempotency key. */
  id: string;
  type: string;
  externalChargeId: string;
  status: GatewayChargeStatus;
  amountMinor?: number;
  failureCode?: string;
  failureMessage?: string;
  raw: unknown;
}

export interface PaymentGateway {
  readonly name: string;
  /** Methods this gateway can actually process right now. */
  readonly supportedMethods: readonly ("CARD" | "PROMPTPAY")[];

  createCharge(request: ChargeRequest): Promise<ChargeResult>;
  capture(externalChargeId: string, amountMinor: number): Promise<CaptureResult>;
  cancel(externalChargeId: string): Promise<void>;
  refund(externalChargeId: string, amountMinor: number): Promise<RefundResult>;

  /** Verify the provider's signature over the raw request body. */
  verifyWebhook(rawBody: string, signature: string | null): boolean;
  parseWebhook(rawBody: string): WebhookEvent;
}
