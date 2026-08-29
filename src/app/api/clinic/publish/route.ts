import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicAdmin } from "@/lib/auth/guards";
import { ConflictError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";

const schema = z.object({ published: z.boolean() });

/**
 * Show or hide the clinic on the marketplace.
 *
 * Only an approved clinic can publish. Approval is the administrator's
 * decision; publication is the clinic's, and both must be true for the clinic
 * to appear publicly.
 */
export const POST = handler(async (request: Request) => {
  const { providerId, user, providerStatus } = await requireClinicAdmin();
  const { published } = await parseBody(request, schema);

  if (published && providerStatus !== "APPROVED") {
    throw new ConflictError("Your clinic must be approved before it can be published.");
  }

  await prisma.provider.update({ where: { id: providerId }, data: { published } });

  await recordAudit({
    action: published ? "clinic.published" : "clinic.unpublished",
    entityType: "Provider",
    entityId: providerId,
    providerId,
    actorId: user.id,
    actorRole: "PROVIDER",
    actorLabel: user.name,
    summary: published ? "Clinic published to the marketplace" : "Clinic hidden from the marketplace",
  });

  return ok({ published });
});
