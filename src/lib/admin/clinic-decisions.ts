import "server-only";

import type { ProviderStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { recordAudit, type AuditAction } from "@/lib/audit";
import { notify } from "@/lib/notifications/service";
import type { SessionUser } from "@/lib/auth/session";

export type Decision =
  | "approve"
  | "reject"
  | "request_changes"
  | "suspend"
  | "reinstate"
  | "deactivate";

interface DecisionConfig {
  status: ProviderStatus;
  action: AuditAction;
  /** Publication is forced off for anything that removes a clinic from view. */
  unpublish: boolean;
  requiresNote: boolean;
  from: ProviderStatus[];
}

const CONFIG: Record<Decision, DecisionConfig> = {
  approve: {
    status: "APPROVED",
    action: "clinic.approved",
    unpublish: false,
    requiresNote: false,
    from: ["PENDING_REVIEW", "CHANGES_REQUESTED", "REJECTED", "SUSPENDED"],
  },
  reject: {
    status: "REJECTED",
    action: "clinic.rejected",
    unpublish: true,
    requiresNote: true,
    from: ["PENDING_REVIEW", "CHANGES_REQUESTED"],
  },
  request_changes: {
    status: "CHANGES_REQUESTED",
    action: "clinic.changes_requested",
    unpublish: false,
    requiresNote: true,
    from: ["PENDING_REVIEW", "APPROVED", "CHANGES_REQUESTED"],
  },
  suspend: {
    status: "SUSPENDED",
    action: "clinic.suspended",
    unpublish: true,
    requiresNote: true,
    from: ["APPROVED", "PENDING_REVIEW", "CHANGES_REQUESTED"],
  },
  reinstate: {
    status: "APPROVED",
    action: "clinic.reinstated",
    unpublish: false,
    requiresNote: false,
    from: ["SUSPENDED", "DEACTIVATED"],
  },
  deactivate: {
    status: "DEACTIVATED",
    action: "clinic.deactivated",
    unpublish: true,
    requiresNote: true,
    from: ["APPROVED", "SUSPENDED", "REJECTED", "PENDING_REVIEW", "CHANGES_REQUESTED", "DRAFT"],
  },
};

export function decisionRequiresNote(decision: Decision): boolean {
  return CONFIG[decision].requiresNote;
}

/**
 * Apply an administrative decision to a clinic.
 *
 * "Removing" a clinic never deletes anything. Suspension and deactivation
 * change its status and take it off the marketplace; bookings, payments and
 * reviews stay in the database and remain visible to administrators, because
 * they are financial and clinical history that other people rely on.
 */
export async function applyClinicDecision(input: {
  providerId: string;
  decision: Decision;
  note?: string;
  admin: SessionUser;
  ip?: string | null;
}): Promise<{ status: ProviderStatus; affectedBookings: number }> {
  const config = CONFIG[input.decision];

  const provider = await prisma.provider.findUnique({
    where: { id: input.providerId },
    select: { id: true, name: true, status: true, published: true },
  });
  if (!provider) throw new NotFoundError("Clinic not found.");

  if (!config.from.includes(provider.status)) {
    throw new ConflictError(
      `A clinic that is ${provider.status.replace(/_/g, " ").toLowerCase()} cannot be ${input.decision.replace(/_/g, " ")}ed.`,
    );
  }
  if (config.requiresNote && !input.note?.trim()) {
    throw new ConflictError(
      "Give a reason — it is recorded in the audit log and sent to the clinic.",
    );
  }

  const now = new Date();

  // Upcoming bookings are reported, not cancelled: an administrator decides
  // what to do about them deliberately rather than as a side effect.
  const affectedBookings =
    config.status === "SUSPENDED" || config.status === "DEACTIVATED"
      ? await prisma.booking.count({
          where: {
            providerId: provider.id,
            status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
            startAt: { gte: now },
          },
        })
      : 0;

  await prisma.$transaction(async (tx) => {
    await tx.provider.update({
      where: { id: provider.id },
      data: {
        status: config.status,
        published: config.unpublish ? false : provider.published,
        reviewedAt: now,
        reviewedById: input.admin.id,
        reviewNote: input.note?.trim() || null,
        verificationStatus:
          input.decision === "approve"
            ? "APPROVED"
            : input.decision === "reject"
              ? "REJECTED"
              : undefined,
        suspendedAt: config.status === "SUSPENDED" ? now : null,
        suspensionReason: config.status === "SUSPENDED" ? input.note?.trim() || null : null,
      },
    });

    if (input.decision === "approve" || input.decision === "reject") {
      await tx.providerVerification.updateMany({
        where: { providerId: provider.id },
        data: {
          status: input.decision === "approve" ? "APPROVED" : "REJECTED",
          reviewedAt: now,
          reviewNote: input.note?.trim() || null,
        },
      });
    }

    await recordAudit(
      {
        action: config.action,
        entityType: "Provider",
        entityId: provider.id,
        providerId: provider.id,
        actorId: input.admin.id,
        actorRole: "ADMIN",
        actorLabel: input.admin.name,
        summary: `${provider.name} — ${input.decision.replace(/_/g, " ")}`,
        metadata: {
          from: provider.status,
          to: config.status,
          note: input.note?.trim() ?? null,
          affectedBookings,
        },
        ip: input.ip,
      },
      tx,
    );
  });

  const notification =
    input.decision === "approve"
      ? "CLINIC_APPROVED"
      : input.decision === "reject"
        ? "CLINIC_REJECTED"
        : input.decision === "request_changes"
          ? "CLINIC_CHANGES_REQUESTED"
          : input.decision === "suspend"
            ? "CLINIC_SUSPENDED"
            : null;

  if (notification) {
    await notify.clinicDecision(provider.id, notification, input.note?.trim());
  }

  return { status: config.status, affectedBookings };
}
