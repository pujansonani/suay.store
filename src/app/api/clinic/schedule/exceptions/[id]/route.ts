import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";

export const DELETE = handler(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { providerId, user } = await requireClinicMember();
  const { id } = await context.params;

  const exception = await prisma.scheduleException.findFirst({
    where: { id, providerId },
    select: { id: true, type: true, date: true },
  });
  if (!exception) throw new ForbiddenError("You do not have access to this schedule entry.");

  await prisma.scheduleException.delete({ where: { id } });

  await recordAudit({
    action: "schedule.updated",
    entityType: "ScheduleException",
    entityId: id,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: `Removed ${exception.type} on ${exception.date.toISOString().slice(0, 10)}`,
  });

  return ok({ ok: true });
});
