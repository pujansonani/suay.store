import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";
import { scheduleExceptionSchema } from "@/lib/validation";
import { dateKeyToDateColumn } from "@/lib/time";

/**
 * A clinic must be able to enter its treatments, practitioners, rooms and
 * opening hours *before* it is approved — that is what the registration flow
 * asks it to do. Suspended and deactivated clinics are still refused.
 */
const SETUP = { allowUnapproved: true } as const;

/**
 * Add a closure, a modified day or a block of time off.
 *
 * Existing bookings are never removed by this: an exception that covers a
 * booked time stops new bookings being taken, and the clinic is told what is
 * already in the diary so it can deal with those appointments deliberately.
 */
export const POST = handler(async (request: Request) => {
  const { providerId, user } = await requireClinicMember(SETUP);
  const input = await parseBody(request, scheduleExceptionSchema);

  if (input.type !== "CLOSED") {
    if (input.startMinute == null || input.endMinute == null) {
      throw new ValidationError("Give a start and end time for this period.");
    }
    if (input.endMinute <= input.startMinute) {
      throw new ValidationError("The period must end after it starts.");
    }
  }

  if (input.staffId) {
    const owned = await prisma.staff.findFirst({
      where: { id: input.staffId, providerId },
      select: { id: true },
    });
    if (!owned) throw new ForbiddenError("You do not have access to this practitioner.");
  }

  const date = dateKeyToDateColumn(input.date);

  const exception = await prisma.scheduleException.create({
    data: {
      providerId,
      staffId: input.staffId || null,
      date,
      type: input.type,
      startMinute: input.type === "CLOSED" ? null : input.startMinute,
      endMinute: input.type === "CLOSED" ? null : input.endMinute,
      reason: input.reason || null,
    },
    select: { id: true },
  });

  const affected = await prisma.booking.count({
    where: {
      providerId,
      status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
      startAt: { gte: date, lt: new Date(date.getTime() + 86_400_000) },
      ...(input.staffId ? { staffId: input.staffId } : {}),
    },
  });

  await recordAudit({
    action: "schedule.updated",
    entityType: "ScheduleException",
    entityId: exception.id,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: `${input.type} on ${input.date}`,
    metadata: { affectedBookings: affected },
  });

  return ok({ exception, affectedBookings: affected }, 201);
});
