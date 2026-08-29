import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { requireClinicMember } from "@/lib/auth/guards";
import { cancelBooking, rescheduleBooking, setBookingOutcome } from "@/lib/booking/service";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("no_show") }),
  z.object({
    action: z.literal("reschedule"),
    startAt: z.string().datetime(),
    staffId: z.string().optional().nullable(),
  }),
]);

/**
 * Act on one of this clinic's bookings.
 *
 * `providerId` is passed into every service call so that ownership is checked
 * against the stored row inside the same transaction that changes it.
 */
export const PATCH = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { providerId, user } = await requireClinicMember();
  const { id } = await context.params;
  const input = await parseBody(request, schema);

  switch (input.action) {
    case "cancel":
      await cancelBooking({
        bookingId: id,
        actorId: user.id,
        actorRole: "PROVIDER",
        providerId,
        reason: input.reason,
      });
      break;

    case "reschedule":
      await rescheduleBooking({
        bookingId: id,
        startAt: new Date(input.startAt),
        staffId: input.staffId ?? null,
        actorId: user.id,
        actorRole: "PROVIDER",
        providerId,
      });
      break;

    case "complete":
    case "no_show":
      await setBookingOutcome({
        bookingId: id,
        providerId,
        outcome: input.action === "complete" ? "COMPLETED" : "NO_SHOW",
        actorId: user.id,
        actorRole: "PROVIDER",
      });
      break;
  }

  return ok({ ok: true });
});
