import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";
import { staffSchema } from "@/lib/validation";

export const PATCH = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { providerId, user } = await requireClinicMember();
  const { id } = await context.params;
  const input = await parseBody(request, staffSchema);

  const existing = await prisma.staff.findFirst({ where: { id, providerId }, select: { id: true } });
  if (!existing) throw new ForbiddenError("You do not have access to this practitioner.");

  const services = await prisma.service.findMany({
    where: { providerId, id: { in: input.serviceIds } },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.staff.update({
      where: { id },
      data: {
        name: input.name,
        role: input.role,
        bio: input.bio || null,
        credentials: input.credentials,
        qualifications: input.qualifications,
        specializations: input.specializations,
        languages: input.languages,
        yearsExperience: input.yearsExperience ?? null,
        active: input.active,
      },
    });

    await tx.staffService.deleteMany({ where: { staffId: id } });
    await tx.staffService.createMany({
      data: services.map((s) => ({ staffId: id, serviceId: s.id })),
    });

    await recordAudit(
      {
        action: "staff.updated",
        entityType: "Staff",
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

export const DELETE = handler(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { providerId, user } = await requireClinicMember();
  const { id } = await context.params;

  const member = await prisma.staff.findFirst({
    where: { id, providerId },
    select: { id: true, name: true, _count: { select: { bookings: true } } },
  });
  if (!member) throw new ForbiddenError("You do not have access to this practitioner.");

  const upcoming = await prisma.booking.count({
    where: { staffId: id, status: { in: ["PENDING_PAYMENT", "CONFIRMED"] }, startAt: { gte: new Date() } },
  });
  if (upcoming > 0) {
    throw new ConflictError(
      `${member.name} has ${upcoming} upcoming ${upcoming === 1 ? "appointment" : "appointments"}. Reassign or cancel them first.`,
    );
  }

  // Keep the person on past appointments; just take them off the rota.
  if (member._count.bookings > 0) {
    await prisma.staff.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.staff.delete({ where: { id } });
  }

  await recordAudit({
    action: "staff.deleted",
    entityType: "Staff",
    entityId: id,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: member.name,
    metadata: { archived: member._count.bookings > 0 },
  });

  return ok({ ok: true, archived: member._count.bookings > 0 });
});
