import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ConflictError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";
import { clinicRegisterSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

/**
 * Create a clinic account.
 *
 * The clinic starts as DRAFT and unpublished: it cannot be found by patients
 * and cannot take bookings until a platform administrator approves it. The
 * owner account is created as CLINIC_ADMIN — the role is set here, never
 * taken from the request.
 */
export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, clinicRegisterSchema);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError(
      "An account already exists with that email address. Try signing in instead.",
      "EMAIL_TAKEN",
    );
  }

  const slug = await uniqueSlug(slugify(input.clinicName) || "clinic");

  const { userId, providerId } = await prisma.$transaction(async (tx) => {
    const provider = await tx.provider.create({
      data: {
        slug,
        name: input.clinicName,
        phone: input.phone,
        email: input.email,
        status: "DRAFT",
        published: false,
        onboardingStep: 2,
        verificationStatus: "NOT_SUBMITTED",
      },
    });

    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        name: input.contactName,
        phone: input.phone,
        role: "CLINIC_ADMIN",
        providerId: provider.id,
      },
    });

    await tx.providerVerification.create({
      data: {
        providerId: provider.id,
        contactPersonName: input.contactName,
        contactPersonEmail: input.email,
        contactPersonPhone: input.phone,
        status: "NOT_SUBMITTED",
      },
    });

    await recordAudit(
      {
        action: "clinic.registered",
        entityType: "Provider",
        entityId: provider.id,
        providerId: provider.id,
        actorId: user.id,
        actorRole: "PROVIDER",
        actorLabel: input.contactName,
        summary: `${input.clinicName} created an account`,
      },
      tx,
    );

    return { userId: user.id, providerId: provider.id };
  });

  await createSession(userId);
  return ok({ providerId, redirectTo: "/clinic/register/business" }, 201);
});

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let suffix = 1;
  // Slugs are public URLs, so collisions must be resolved before insert.
  while (await prisma.provider.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}
