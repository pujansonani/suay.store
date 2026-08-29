import { handler, ok, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/guards";
import { createBooking } from "@/lib/booking/service";
import { notify } from "@/lib/notifications/service";
import { createBookingSchema } from "@/lib/validation";

/**
 * Create a marketplace booking and hold the slot for payment.
 *
 * The customer identity comes from the session. `customerId` is never read
 * from the body, so one signed-in customer cannot create a booking in another
 * customer's name.
 */
export const POST = handler(async (request: Request) => {
  const user = await requireCustomer();
  const input = await parseBody(request, createBookingSchema);

  const booking = await createBooking({
    providerId: input.providerId,
    serviceId: input.serviceId,
    startAt: new Date(input.startAt),
    staffId: input.staffId ?? null,
    customerId: user.id,
    customerName: input.customerName,
    customerEmail: input.customerEmail ?? user.email,
    customerPhone: input.customerPhone || null,
    customerNote: input.customerNote || null,
    channel: "MARKETPLACE",
    landingPath: input.landingPath ?? null,
    actorId: user.id,
    actorRole: "CUSTOMER",
  });

  await notify.bookingCreated(booking.id);

  return ok({ booking }, 201);
});
