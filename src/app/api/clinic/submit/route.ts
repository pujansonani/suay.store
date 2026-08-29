import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicAdmin } from "@/lib/auth/guards";
import { ConflictError, ValidationError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";

/**
 * Submit the clinic for review.
 *
 * The clinic moves to PENDING_REVIEW and waits for a platform administrator.
 * It cannot set itself to APPROVED, and it does not become public here —
 * approval and publication are separate, later steps.
 */
export const POST = handler(async () => {
  const { providerId, user } = await requireClinicAdmin({ allowUnapproved: true });

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      name: true,
      status: true,
      description: true,
      phone: true,
      addressLine1: true,
      district: true,
      verification: { select: { businessRegistrationNo: true, contactPersonName: true } },
      _count: { select: { services: true, staff: true, scheduleRules: true } },
    },
  });
  if (!provider) throw new ConflictError("Clinic not found.");

  if (provider.status === "PENDING_REVIEW") {
    throw new ConflictError("Your application is already awaiting review.");
  }
  if (provider.status === "APPROVED") {
    throw new ConflictError("Your clinic is already approved.");
  }
  if (provider.status === "SUSPENDED" || provider.status === "DEACTIVATED") {
    throw new ConflictError("Please contact Suay support about this clinic account.");
  }

  // Everything an administrator needs in order to make a decision.
  const missing: string[] = [];
  if (!provider.description) missing.push("a description of the clinic");
  if (!provider.phone) missing.push("a contact phone number");
  if (!provider.addressLine1) missing.push("a street address");
  if (provider._count.services === 0) missing.push("at least one treatment");
  if (provider._count.staff === 0) missing.push("at least one practitioner");
  if (provider._count.scheduleRules === 0) missing.push("your opening hours");
  if (!provider.verification?.businessRegistrationNo) missing.push("your business registration number");

  if (missing.length > 0) {
    throw new ValidationError(
      `Before submitting, please add ${missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`}.`,
      { missing },
    );
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.provider.update({
      where: { id: providerId },
      data: {
        status: "PENDING_REVIEW",
        verificationStatus: "PENDING",
        submittedAt: now,
        onboardingStep: 9,
        reviewNote: null,
      },
    });

    await tx.providerVerification.update({
      where: { providerId },
      data: { status: "PENDING", submittedAt: now },
    });

    await recordAudit(
      {
        action: "clinic.submitted",
        entityType: "Provider",
        entityId: providerId,
        providerId,
        actorId: user.id,
        actorRole: "PROVIDER",
        actorLabel: user.name,
        summary: `${provider.name} submitted for verification`,
      },
      tx,
    );
  });

  return ok({ ok: true, status: "PENDING_REVIEW" });
});
