import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { serviceSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { getClinicServices } from "@/lib/data/clinic";

export const GET = handler(async () => {
  const { providerId } = await requireClinicMember();
  return ok({ services: await getClinicServices(providerId) });
});

/**
 * Create a treatment.
 *
 * Practitioner and resource links are validated against this clinic's own
 * records: passing another clinic's staff id simply matches nothing.
 */
export const POST = handler(async (request: Request) => {
  const { providerId, user } = await requireClinicMember();
  const input = await parseBody(request, serviceSchema);

  const ownStaffIds = await ownedStaffIds(providerId, input.staffIds);

  const service = await prisma.service.create({
    data: {
      providerId,
      name: input.name,
      slug: await uniqueSlug(providerId, slugify(input.name) || "treatment"),
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
      staffLinks: { create: ownStaffIds.map((staffId) => ({ staffId })) },
      resourceRequirements: {
        create: input.requirements.map((r) => ({
          resourceType: r.resourceType,
          resourceTag: r.resourceTag || null,
          quantity: r.quantity,
        })),
      },
    },
    select: { id: true, name: true },
  });

  await recordAudit({
    action: "service.created",
    entityType: "Service",
    entityId: service.id,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: service.name,
  });

  return ok({ service }, 201);
});

async function ownedStaffIds(providerId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.staff.findMany({
    where: { providerId, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function uniqueSlug(providerId: string, base: string): Promise<string> {
  let candidate = base;
  let suffix = 1;
  while (
    await prisma.service.findUnique({
      where: { providerId_slug: { providerId, slug: candidate } },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}
