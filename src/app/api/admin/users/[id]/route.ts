import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { recordAudit, requestIp } from "@/lib/audit";

const schema = z.object({
  action: z.enum(["suspend", "reinstate"]),
  reason: z.string().trim().max(500).optional(),
});

/** Suspend or reinstate an account. Suspension takes effect on the next request. */
export const PATCH = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const { action, reason } = await parseBody(request, schema);

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!user) throw new NotFoundError("User not found.");

  // Guard against an administrator locking themselves out.
  if (user.id === admin.id) {
    throw new ConflictError("You cannot suspend your own account.");
  }

  const status = action === "suspend" ? "SUSPENDED" : "ACTIVE";
  await prisma.user.update({ where: { id }, data: { status } });

  await recordAudit({
    action: action === "suspend" ? "user.suspended" : "user.reinstated",
    entityType: "User",
    entityId: id,
    actorId: admin.id,
    actorRole: "ADMIN",
    actorLabel: admin.name,
    summary: `${user.email} ${action === "suspend" ? "suspended" : "reinstated"}`,
    metadata: { role: user.role, reason: reason ?? null },
    ip: requestIp(request),
  });

  return ok({ status });
});
