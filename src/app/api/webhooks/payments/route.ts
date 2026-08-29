import { NextResponse } from "next/server";

import { handleWebhookEvent } from "@/lib/payments/service";
import { isAppError } from "@/lib/errors";

/**
 * Payment gateway webhook.
 *
 * The raw body is read as text because the signature is computed over the
 * exact bytes the provider sent — parsing first and re-serialising would
 * change them. Verification happens before anything is trusted, and
 * idempotency is handled by the unique key on PaymentEvent, so a provider
 * retrying the same event cannot capture a payment twice.
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-suay-signature") ?? request.headers.get("x-webhook-signature");

  try {
    const result = await handleWebhookEvent(rawBody, signature);
    // Always 200 on a duplicate: the provider should stop retrying.
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    console.error("[webhook] processing failed", error);
    // A 500 tells the provider to retry, which the idempotency key makes safe.
    return NextResponse.json({ error: { code: "WEBHOOK_FAILED" } }, { status: 500 });
  }
}
