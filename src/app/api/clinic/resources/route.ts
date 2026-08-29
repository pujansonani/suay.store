import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { resourceSchema } from "@/lib/validation";
import { getClinicResources } from "@/lib/data/clinic";

export const GET = handler(async () => {
  const { providerId } = await requireClinicMember();
  return ok({ resources: await getClinicResources(providerId) });
});

export const POST = handler(async (request: Request) => {
  const { providerId, user } = await requireClinicMember();
  const input = await parseBody(request, resourceSchema);

  const resource = await prisma.resource.create({
    data: {
      providerId,
      name: input.name,
      type: input.type,
      tag: input.tag || null,
      notes: input.notes || null,
      active: input.active,
    },
    select: { id: true, name: true },
  });

  await recordAudit({
    action: "resource.created",
    entityType: "Resource",
    entityId: resource.id,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: resource.name,
  });

  return ok({ resource }, 201);
});
