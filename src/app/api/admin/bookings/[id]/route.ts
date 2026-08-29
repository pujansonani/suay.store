import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { cancelBooking, rescheduleBooking } from "@/lib/booking/service";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
    reason: z.string().trim().min(3, "Give a reason — it is recorded in the audit log.").max(500),
  }),
  z.object({
    action: z.literal("reschedule"),
    startAt: z.string().datetime(),
    staffId: z.string().optional().nullable(),
  }),
]);

/**
 * Administrative action on any booking.
 *
 * No `providerId` guard is passed, because platform administrators are
 * intended to reach every clinic. Every change is audited with the acting
 * administrator's identity.
 */
export const PATCH = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const input = await parseBody(request, schema);

  if (input.action === "cancel") {
    await cancelBooking({
      bookingId: id,
      actorId: admin.id,
      actorRole: "ADMIN",
      reason: input.reason,
    });
  } else {
    await rescheduleBooking({
      bookingId: id,
      startAt: new Date(input.startAt),
      staffId: input.staffId ?? null,
      actorId: admin.id,
      actorRole: "ADMIN",
    });
  }

  return ok({ ok: true });
});
