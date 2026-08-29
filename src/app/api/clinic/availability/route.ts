import { handler, ok, parseQuery } from "@/lib/api";
import { requireClinicMember } from "@/lib/auth/guards";
import { getAvailability } from "@/lib/booking/availability";
import { availabilityQuerySchema } from "@/lib/validation";

/**
 * Availability for the clinic's own front desk.
 *
 * Uses the authenticated clinic id, and allows times inside the customer-facing
 * minimum-notice window so a walk-in can be booked into the next slot.
 */
export const GET = handler(async (request: Request) => {
  const { providerId } = await requireClinicMember();
  const query = parseQuery(request, availabilityQuerySchema);

  const days = await getAvailability({
    providerId,
    serviceId: query.serviceId,
    from: query.from,
    to: query.to ?? query.from,
    staffId: query.staffId ?? null,
    ignoreMinNotice: true,
  });

  return ok({ days });
});
