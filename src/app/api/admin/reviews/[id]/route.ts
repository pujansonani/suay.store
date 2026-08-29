import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { recordAudit, requestIp } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["PUBLISHED", "PENDING_MODERATION", "REMOVED"]),
  reason: z.string().trim().max(500).optional(),
});

/**
 * Moderate a review.
 *
 * The review text is never edited — only its visibility changes — so a removed
 * review can still be inspected by administrators and restored if the decision
 * was wrong.
 */
export const PATCH = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const { status, reason } = await parseBody(request, schema);

  const review = await prisma.review.findUnique({
    where: { id },
    select: { id: true, providerId: true, rating: true, status: true },
  });
  if (!review) throw new NotFoundError("Review not found.");

  await prisma.review.update({ where: { id }, data: { status } });

  // Keep the clinic's published rating consistent with visible reviews.
  const stats = await prisma.review.aggregate({
    where: { providerId: review.providerId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.provider.update({
    where: { id: review.providerId },
    data: {
      ratingAverage: Number((stats._avg.rating ?? 0).toFixed(2)),
      ratingCount: stats._count,
    },
  });

  await recordAudit({
    action: "review.moderated",
    entityType: "Review",
    entityId: id,
    providerId: review.providerId,
    actorId: admin.id,
    actorRole: "ADMIN",
    actorLabel: admin.name,
    summary: `Review set to ${status.toLowerCase().replace(/_/g, " ")}`,
    metadata: { from: review.status, to: status, reason: reason ?? null },
    ip: requestIp(request),
  });

  return ok({ status });
});
