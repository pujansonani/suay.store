import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { recordAudit, requestIp } from "@/lib/audit";
import { clinicProfileSchema } from "@/lib/validation";

/**
 * Edit a clinic on its behalf.
 *
 * Administrators can correct clinic information — a wrong address, an unclear
 * policy — but the edit is recorded with a diff so it is always visible who
 * changed what. Approval status is not settable here; it has its own
 * endpoints so that every decision is an explicit, audited act.
 */
export const PATCH = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const input = await parseBody(request, clinicProfileSchema);

  const before = await prisma.provider.findUnique({
    where: { id },
    select: {
      name: true,
      legalName: true,
      specialty: true,
      description: true,
      email: true,
      phone: true,
      addressLine1: true,
      district: true,
      city: true,
      postalCode: true,
      cancellationPolicy: true,
      bookingPolicy: true,
    },
  });
  if (!before) throw new NotFoundError("Clinic not found.");

  const after = {
    name: input.name,
    legalName: input.legalName || null,
    specialty: input.specialty || null,
    description: input.description || null,
    email: input.email || null,
    phone: input.phone || null,
    addressLine1: input.addressLine1 || null,
    district: input.district || null,
    city: input.city || "Bangkok",
    postalCode: input.postalCode || null,
    cancellationPolicy: input.cancellationPolicy || null,
    bookingPolicy: input.bookingPolicy || null,
  };

  const changed: Record<string, { from: string | null; to: string | null }> = {};
  for (const [key, value] of Object.entries(after)) {
    const previous = (before as Record<string, string | null>)[key] ?? null;
    if (previous !== value) changed[key] = { from: previous, to: value };
  }

  await prisma.provider.update({
    where: { id },
    data: { ...after, website: input.website || null, lineId: input.lineId || null },
  });

  await recordAudit({
    action: "clinic.updated",
    entityType: "Provider",
    entityId: id,
    providerId: id,
    actorId: admin.id,
    actorRole: "ADMIN",
    actorLabel: admin.name,
    summary: `${input.name} edited by an administrator`,
    metadata: { changed },
    ip: requestIp(request),
  });

  return ok({ ok: true, changed: Object.keys(changed) });
});
