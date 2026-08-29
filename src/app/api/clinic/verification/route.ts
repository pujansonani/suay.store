import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicAdmin } from "@/lib/auth/guards";
import { verificationSchema } from "@/lib/validation";

/** Save verification details. Submitting them for review is a separate step. */
export const PUT = handler(async (request: Request) => {
  const { providerId } = await requireClinicAdmin({ allowUnapproved: true });
  const input = await parseBody(request, verificationSchema);

  await prisma.providerVerification.upsert({
    where: { providerId },
    create: {
      providerId,
      businessRegistrationNo: input.businessRegistrationNo || null,
      taxId: input.taxId || null,
      medicalLicenseNo: input.medicalLicenseNo || null,
      licenceAuthority: input.licenceAuthority || null,
      contactPersonName: input.contactPersonName || null,
      contactPersonRole: input.contactPersonRole || null,
      contactPersonPhone: input.contactPersonPhone || null,
      contactPersonEmail: input.contactPersonEmail || null,
      documentRefs: input.documentRefs,
      notes: input.notes || null,
    },
    update: {
      businessRegistrationNo: input.businessRegistrationNo || null,
      taxId: input.taxId || null,
      medicalLicenseNo: input.medicalLicenseNo || null,
      licenceAuthority: input.licenceAuthority || null,
      contactPersonName: input.contactPersonName || null,
      contactPersonRole: input.contactPersonRole || null,
      contactPersonPhone: input.contactPersonPhone || null,
      contactPersonEmail: input.contactPersonEmail || null,
      documentRefs: input.documentRefs,
      notes: input.notes || null,
    },
  });

  return ok({ ok: true });
});
