import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";
import { serviceSchema } from "@/lib/validation";

/**
 * Update a treatment.
 *
 * The lookup is `findFirst({ id, providerId })` rather than `findUnique({ id })`
 * — an id belonging to another clinic returns nothing, and the caller is told
 * only that they do not have access.
 */
export const PATCH = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { providerId, user } = await requireClinicMember();
  const { id } = await context.params;
  const input = await parseBody(request, serviceSchema);

  const existing = await prisma.service.findFirst({
    where: { id, providerId },
    select: { id: true },
  });
  if (!existing) throw new ForbiddenError("You do not have access to this treatment.");

  const staffRows = await prisma.staff.findMany({
    where: { providerId, id: { in: input.staffIds } },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.service.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description || null,
        importantInfo: input.importantInfo || null,
        categoryId: input.categoryId || null,
        serviceClass: input.serviceClass,
        isMedicalAesthetic: input.isMedicalAesthetic,
        durationMinutes: input.durationMinutes,
        bufferBeforeMinutes: input.bufferBeforeMinutes,
        bufferAfterMinutes: input.bufferAfterMinutes,
        priceMinor: input.priceMinor,
        requiresStaff: input.requiresStaff,
        active: input.active,
      },
    });

    await tx.staffService.deleteMany({ where: { serviceId: id } });
    await tx.staffService.createMany({
      data: staffRows.map((s) => ({ staffId: s.id, serviceId: id })),
    });

    await tx.serviceResourceRequirement.deleteMany({ where: { serviceId: id } });
    for (const requirement of input.requirements) {
      await tx.serviceResourceRequirement.create({
        data: {
          serviceId: id,
          resourceType: requirement.resourceType,
          resourceTag: requirement.resourceTag || null,
          quantity: requirement.quantity,
        },
      });
    }

    await recordAudit(
      {
        action: "service.updated",
        entityType: "Service",
        entityId: id,
        providerId,
        actorId: user.id,
        actorRole: "PROVIDER",
        actorLabel: user.name,
        summary: input.name,
      },
      tx,
    );
  });

  return ok({ ok: true });
});

/**
 * Retire a treatment.
 *
 * A treatment with bookings is deactivated rather than deleted: removing it
 * would take the appointment history with it.
 */
export const DELETE = handler(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { providerId, user } = await requireClinicMember();
  const { id } = await context.params;

  const service = await prisma.service.findFirst({
    where: { id, providerId },
    select: { id: true, name: true, _count: { select: { bookings: true } } },
  });
  if (!service) throw new ForbiddenError("You do not have access to this treatment.");

  const upcoming = await prisma.booking.count({
    where: { serviceId: id, status: { in: ["PENDING_PAYMENT", "CONFIRMED"] }, startAt: { gte: new Date() } },
  });
  if (upcoming > 0) {
    throw new ConflictError(
      `This treatment has ${upcoming} upcoming ${upcoming === 1 ? "appointment" : "appointments"}. Cancel or complete them before removing it.`,
    );
  }

  if (service._count.bookings > 0) {
    await prisma.service.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.service.delete({ where: { id } });
  }

  await recordAudit({
    action: "service.deleted",
    entityType: "Service",
    entityId: id,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: service.name,
    metadata: { archived: service._count.bookings > 0 },
  });

  return ok({ ok: true, archived: service._count.bookings > 0 });
});
