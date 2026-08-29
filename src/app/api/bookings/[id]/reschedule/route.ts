import { handler, ok, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/guards";
import { rescheduleBooking } from "@/lib/booking/service";
import { rescheduleSchema } from "@/lib/validation";

/**
 * Customer reschedule. Availability is recalculated from scratch against the
 * practitioner, room and equipment — the time is never simply overwritten.
 */
export const POST = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireCustomer();
  const { id } = await context.params;
  const input = await parseBody(request, rescheduleSchema);

  await rescheduleBooking({
    bookingId: id,
    startAt: new Date(input.startAt),
    staffId: input.staffId ?? null,
    actorId: user.id,
    actorRole: "CUSTOMER",
    customerId: user.id,
  });

  return ok({ ok: true });
});
