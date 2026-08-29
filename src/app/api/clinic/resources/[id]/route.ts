import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";
import { resourceSchema } from "@/lib/validation";

export const PATCH = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { providerId, user } = await requireClinicMember();
  const { id } = await context.params;
  const input = await parseBody(request, resourceSchema);

  const existing = await prisma.resource.findFirst({ where: { id, providerId }, select: { id: true } });
  if (!existing) throw new ForbiddenError("You do not have access to this room or device.");

  await prisma.resource.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      tag: input.tag || null,
      notes: input.notes || null,
      active: input.active,
    },
  });

  await recordAudit({
    action: "resource.updated",
    entityType: "Resource",
    entityId: id,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: input.name,
  });

  return ok({ ok: true });
});

export const DELETE = handler(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { providerId, user } = await requireClinicMember();
  const { id } = await context.params;

  const resource = await prisma.resource.findFirst({
    where: { id, providerId },
    select: { id: true, name: true, _count: { select: { bookingAssignments: true } } },
  });
  if (!resource) throw new ForbiddenError("You do not have access to this room or device.");

  const upcoming = await prisma.bookingResourceAssignment.count({
    where: {
      resourceId: id,
      active: true,
      booking: { status: { in: ["PENDING_PAYMENT", "CONFIRMED"] }, startAt: { gte: new Date() } },
    },
  });
  if (upcoming > 0) {
    throw new ConflictError(
      `${resource.name} is reserved by ${upcoming} upcoming ${upcoming === 1 ? "appointment" : "appointments"}.`,
    );
  }

  if (resource._count.bookingAssignments > 0) {
    await prisma.resource.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.resource.delete({ where: { id } });
  }

  await recordAudit({
    action: "resource.deleted",
    entityType: "Resource",
    entityId: id,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: resource.name,
  });

  return ok({ ok: true, archived: resource._count.bookingAssignments > 0 });
});
