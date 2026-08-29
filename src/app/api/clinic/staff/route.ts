import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { staffSchema } from "@/lib/validation";
import { getClinicStaff } from "@/lib/data/clinic";

/**
 * A clinic must be able to enter its treatments, practitioners, rooms and
 * opening hours *before* it is approved — that is what the registration flow
 * asks it to do. Suspended and deactivated clinics are still refused.
 */
const SETUP = { allowUnapproved: true } as const;

export const GET = handler(async () => {
  const { providerId } = await requireClinicMember(SETUP);
  return ok({ staff: await getClinicStaff(providerId) });
});

export const POST = handler(async (request: Request) => {
  const { providerId, user } = await requireClinicMember(SETUP);
  const input = await parseBody(request, staffSchema);

  const services = await prisma.service.findMany({
    where: { providerId, id: { in: input.serviceIds } },
    select: { id: true },
  });

  const member = await prisma.staff.create({
    data: {
      providerId,
      name: input.name,
      role: input.role,
      bio: input.bio || null,
      credentials: input.credentials,
      qualifications: input.qualifications,
      specializations: input.specializations,
      languages: input.languages,
      yearsExperience: input.yearsExperience ?? null,
      active: input.active,
      // `verified` is deliberately not settable by the clinic. Only a platform
      // admin can mark a practitioner as verified, so the badge means something.
      services: { create: services.map((s) => ({ serviceId: s.id })) },
    },
    select: { id: true, name: true },
  });

  await recordAudit({
    action: "staff.created",
    entityType: "Staff",
    entityId: member.id,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: member.name,
  });

  return ok({ staff: member }, 201);
});
