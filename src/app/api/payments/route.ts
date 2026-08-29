import { handler, ok, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/guards";
import { startPayment } from "@/lib/payments/service";
import { startPaymentSchema } from "@/lib/validation";

/** Begin payment for a held booking. Ownership is checked in `startPayment`. */
export const POST = handler(async (request: Request) => {
  const user = await requireCustomer();
  const input = await parseBody(request, startPaymentSchema);

  const result = await startPayment({
    bookingId: input.bookingId,
    customerId: user.id,
    method: input.method,
    simulate: input.simulate,
  });

  return ok(result);
});
