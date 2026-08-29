import { handler, ok, parseBody } from "@/lib/api";
import { requireClinicMember } from "@/lib/auth/guards";
import { createBooking } from "@/lib/booking/service";
import { providerManualBookingSchema } from "@/lib/validation";
import { getClinicBookings } from "@/lib/data/clinic";

export const GET = handler(async (request: Request) => {
  const { providerId } = await requireClinicMember();
  const params = new URL(request.url).searchParams;

  const result = await getClinicBookings(providerId, {
    status: params.get("status") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    query: params.get("q") ?? undefined,
    staffId: params.get("staffId") ?? undefined,
    page: Number(params.get("page") ?? 1) || 1,
  });

  return ok(result);
});

/**
 * Record a walk-in, phone or LINE booking.
 *
 * These consume the same practitioner, room and equipment capacity as a
 * marketplace booking, and go through the same availability resolution and
 * the same database constraints — so the clinic cannot accidentally
 * double-book itself from the front desk either.
 */
export const POST = handler(async (request: Request) => {
  const { providerId, user } = await requireClinicMember();
  const input = await parseBody(request, providerManualBookingSchema);

  const booking = await createBooking({
    providerId,
    serviceId: input.serviceId,
    startAt: new Date(input.startAt),
    staffId: input.staffId ?? null,
    customerId: null,
    customerName: input.customerName,
    customerEmail: input.customerEmail || null,
    customerPhone: input.customerPhone || null,
    customerNote: input.customerNote || null,
    channel: input.channel,
    attributionSource: "PROVIDER_MANUAL",
    confirmImmediately: true,
    actorId: user.id,
    actorRole: "PROVIDER",
  });

  return ok({ booking }, 201);
});
