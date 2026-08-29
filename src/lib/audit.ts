import "server-only";

import type { ActorRole, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Audit trail.
 *
 * Every consequential action — approvals, suspensions, edits made on someone
 * else's behalf, payment state changes — writes one row here. Rows are never
 * updated or deleted by the application.
 */
export type AuditAction =
  | "clinic.registered"
  | "clinic.submitted"
  | "clinic.approved"
  | "clinic.rejected"
  | "clinic.changes_requested"
  | "clinic.suspended"
  | "clinic.reinstated"
  | "clinic.deactivated"
  | "clinic.updated"
  | "clinic.published"
  | "clinic.unpublished"
  | "service.created"
  | "service.updated"
  | "service.deleted"
  | "staff.created"
  | "staff.updated"
  | "staff.deleted"
  | "staff.verified"
  | "resource.created"
  | "resource.updated"
  | "resource.deleted"
  | "schedule.updated"
  | "booking.created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.rescheduled"
  | "booking.completed"
  | "booking.no_show"
  | "payment.state_changed"
  | "payment.refunded"
  | "review.moderated"
  | "user.suspended"
  | "user.reinstated"
  | "settings.updated";

export interface AuditInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorRole?: ActorRole;
  actorLabel?: string | null;
  providerId?: string | null;
  summary?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}

export async function recordAudit(
  input: AuditInput,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? "SYSTEM",
      actorLabel: input.actorLabel ?? null,
      providerId: input.providerId ?? null,
      summary: input.summary,
      metadata: input.metadata,
      ip: input.ip ?? null,
    },
  });
}

export function requestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}
