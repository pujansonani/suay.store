import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { recordAudit, requestIp } from "@/lib/audit";

const schema = z.object({ verified: z.boolean() });

/**
 * Mark a practitioner as verified.
 *
 * Only a platform administrator can do this — a clinic cannot verify its own
 * staff — which is what makes the badge on a public profile meaningful.
 */
export const POST = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const { verified } = await parseBody(request, schema);

  const member = await prisma.staff.findUnique({
    where: { id },
    select: { id: true, name: true, providerId: true },
  });
  if (!member) throw new NotFoundError("Practitioner not found.");

  await prisma.staff.update({
    where: { id },
    data: { verified, verifiedAt: verified ? new Date() : null },
  });

  await recordAudit({
    action: "staff.verified",
    entityType: "Staff",
    entityId: id,
    providerId: member.providerId,
    actorId: admin.id,
    actorRole: "ADMIN",
    actorLabel: admin.name,
    summary: `${member.name} ${verified ? "verified" : "unverified"}`,
    ip: requestIp(request),
  });

  return ok({ verified });
});
