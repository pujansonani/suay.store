import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clinicProfileSchema } from "@/lib/validation";

/** Edit your own clinic profile. Clinic administrators only. */
export const PATCH = handler(async (request: Request) => {
  const { providerId, user } = await requireClinicAdmin({ allowUnapproved: true });
  const input = await parseBody(request, clinicProfileSchema);

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      name: input.name,
      legalName: input.legalName || null,
      specialty: input.specialty || null,
      tagline: input.tagline || null,
      description: input.description || null,
      email: input.email || null,
      phone: input.phone || null,
      website: input.website || null,
      lineId: input.lineId || null,
      addressLine1: input.addressLine1 || null,
      district: input.district || null,
      city: input.city || "Bangkok",
      postalCode: input.postalCode || null,
      cancellationPolicy: input.cancellationPolicy || null,
      bookingPolicy: input.bookingPolicy || null,
      cancellationWindowHours: input.cancellationWindowHours ?? null,
      // `status`, `published` and `verificationStatus` are deliberately absent:
      // a clinic cannot approve or verify itself.
    },
  });

  await recordAudit({
    action: "clinic.updated",
    entityType: "Provider",
    entityId: providerId,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: "Clinic profile updated",
  });

  return ok({ ok: true });
});
