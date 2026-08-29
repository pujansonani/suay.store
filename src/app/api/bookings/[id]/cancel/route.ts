import { handler, ok, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/guards";
import { cancelBooking } from "@/lib/booking/service";
import { cancelBookingSchema } from "@/lib/validation";

/** Customer cancellation. Ownership is enforced inside `cancelBooking`. */
export const POST = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireCustomer();
  const { id } = await context.params;
  const { reason } = await parseBody(request, cancelBookingSchema);

  await cancelBooking({
    bookingId: id,
    actorId: user.id,
    actorRole: "CUSTOMER",
    customerId: user.id,
    reason,
  });

  return ok({ ok: true });
});
