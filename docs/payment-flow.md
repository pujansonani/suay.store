# Payment flow

No real money moves in this build, and no card data reaches the application or its
database. What is real is the shape: a gateway interface, separated booking and payment
state, signed webhooks and idempotent event handling.

## The interface

Nothing in the application talks to a payment provider directly. Booking code depends on
`PaymentGateway` (`src/lib/payments/gateway.ts`) only:

```ts
interface PaymentGateway {
  readonly name: string;
  readonly supportedMethods: readonly ("CARD" | "PROMPTPAY")[];

  createCharge(request: ChargeRequest): Promise<ChargeResult>;
  capture(externalChargeId: string, amountMinor: number): Promise<CaptureResult>;
  cancel(externalChargeId: string): Promise<void>;
  refund(externalChargeId: string, amountMinor: number): Promise<RefundResult>;

  verifyWebhook(rawBody: string, signature: string | null): boolean;
  parseWebhook(rawBody: string): WebhookEvent;
}
```

`registry.ts` is the single place that knows which implementation is live, chosen by
`PAYMENT_GATEWAY_PROVIDER`. Omise and 2C2P adapters exist as stubs that **throw loudly**
rather than silently pretending to take money.

Adding a real gateway is one new file plus one line in the registry. The booking flow, the
webhook handler and the state machine do not change.

## The mock gateway

`MockPaymentGateway` simulates authorisation, capture, refund and signed webhooks
entirely locally — no credentials, no network.

- **Card** returns `AUTHORIZED` and a display hint (`•••• 4242`), or `FAILED` when the
  request asks for a decline. Both paths are reachable from the checkout UI so a demo can
  show either.
- **PromptPay** returns `PENDING` and a payload shaped like an EMVCo string so the UI can
  render a realistic QR. It is **not** a valid PromptPay code and cannot move money; the
  interface says so on the page.
- **Webhooks** are signed with HMAC-SHA256 over the raw body, exactly as a real provider
  would, and verified with a constant-time comparison.

## Two state machines, deliberately separate

```
Booking:   PENDING_PAYMENT ──► CONFIRMED ──► COMPLETED
Payment:   PENDING ─► AUTHORIZED ─► CAPTURED ─► REFUNDED | PARTIALLY_REFUNDED
                   └─► FAILED   └─► CANCELLED
```

The link is one-directional: a captured payment confirms its booking. A payment problem
therefore never leaves a booking in an undefined state — a declined card leaves the
booking `PENDING_PAYMENT` with its hold intact, so the patient can try another method
without losing the slot they chose.

## Card path

```
POST /api/payments  { bookingId, method: "CARD", simulate }
  → requireCustomer()
  → verify the booking belongs to this customer
  → refuse if the hold has lapsed  (HoldExpiredError)
  → create Payment (PENDING)
  → gateway.createCharge()
      ├── FAILED     → mark failed, notify, booking stays PENDING_PAYMENT
      └── AUTHORIZED → capture immediately
                       → Payment CAPTURED
                       → confirmBooking() → Booking CONFIRMED, hold cleared
                       → notify patient and clinic
                       → AuditLog: payment.state_changed
```

A real deployment might hold the authorisation until the clinic accepts rather than
capturing straight away; that is a change inside `startPayment`, not to the flow.

## PromptPay path

```
POST /api/payments  { bookingId, method: "PROMPTPAY" }
  → Payment PENDING, QR payload returned
  → customer scans; the slot stays held while they do
  → gateway calls the webhook
  → booking confirmed
```

The demo's *Simulate payment received* button does not shortcut to "paid". It builds a
properly signed webhook payload and pushes it through the real webhook handler — the same
code path a live gateway triggers, including its idempotency. That keeps the demo honest
about how the system works.

## Webhooks

```
POST /api/webhooks/payments
  → read the RAW body (signature is over the exact bytes sent)
  → gateway.verifyWebhook()          → 403 if it fails
  → gateway.parseWebhook()
  → INSERT PaymentEvent (gateway, externalEventId)   ← unique key
       └── conflict → 200 { applied: false, reason: "duplicate" }
  → apply the state change
  → mark the event processed
```

Idempotency is a database constraint, not a code convention. A provider retrying the same
event records it once and applies it once; a duplicate delivery is a no-op that returns
200 so the provider stops retrying. An unrecognised charge is recorded with a note rather
than dropped, so nothing is lost. A genuine processing failure returns 500 to invite a
retry, which the unique key makes safe.

`src/tests/payments.test.ts` fires the same event three times and asserts one
`PaymentEvent` row and one capture.

## Refunds

`refundPayment()` supports full and partial refunds, clamps the amount to what remains
refundable, moves the payment to `REFUNDED` or `PARTIALLY_REFUNDED`, and writes an audit
entry naming the administrator. Refunding an uncaptured payment is refused.

## Commercial policy

Commission, deposit percentage, cancellation window and late-cancellation fee live in
`PlatformSetting` and are read at runtime — nothing in the booking or payment code
hard-codes them, and an administrator can change them without a deploy. In this build they
are illustrative: the clinic Payments screen shows what commission *would* be, and no
payout is calculated or scheduled. `PayoutBatch` and `PayoutLine` exist in the schema for
that future work.

## What is never stored

No card numbers, no CVV, no expiry dates, no tokens that could be replayed. The database
holds a gateway charge id, a non-sensitive display label, the amounts, the status and the
timestamps. A test asserts that nothing resembling a card number appears anywhere in a
payment row.
