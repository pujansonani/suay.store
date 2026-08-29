import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/clinic/onboarding-wizard";
import { Logo } from "@/components/marketing/logo";
import { SignOutButton } from "@/components/account/sign-out-button";
import { requireClinicOnboardingPage } from "@/lib/auth/routes";
import { prisma } from "@/lib/db";

export const metadata = { title: "Register your clinic" };
export const dynamic = "force-dynamic";

export default async function ClinicOnboardingPage() {
  const session = await requireClinicOnboardingPage("/clinic/onboarding");
  if (!session.providerId) redirect("/clinic/register");
  // A clinic that has already been submitted or decided on sees its status.
  if (session.providerStatus === "APPROVED") redirect("/clinic/dashboard");
  if (session.providerStatus === "PENDING_REVIEW") redirect("/clinic/status");
  if (session.providerStatus === "SUSPENDED" || session.providerStatus === "DEACTIVATED") {
    redirect("/clinic/status");
  }

  const provider = await prisma.provider.findUnique({
    where: { id: session.providerId },
    select: {
      name: true,
      legalName: true,
      specialty: true,
      description: true,
      email: true,
      phone: true,
      website: true,
      addressLine1: true,
      district: true,
      city: true,
      postalCode: true,
      cancellationPolicy: true,
      bookingPolicy: true,
      status: true,
      reviewNote: true,
      services: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, durationMinutes: true, priceMinor: true, active: true },
      },
      staff: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, role: true, services: { select: { serviceId: true } } },
      },
      resources: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, type: true, tag: true },
      },
      scheduleRules: {
        where: { ownerType: "PROVIDER" },
        orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
        select: { dayOfWeek: true, startMinute: true, endMinute: true },
      },
      verification: true,
    },
  });

  if (!provider) redirect("/clinic/register");

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-[0.8125rem] text-ink-muted sm:inline">{session.email}</span>
            <SignOutButton label="Save and sign out" />
          </div>
        </div>
      </header>

      <main id="main">
        <OnboardingWizard
          initial={{
            clinicName: provider.name,
            legalName: provider.legalName ?? "",
            specialty: provider.specialty ?? "",
            description: provider.description ?? "",
            email: provider.email ?? session.email,
            phone: provider.phone ?? "",
            website: provider.website ?? "",
            addressLine1: provider.addressLine1 ?? "",
            district: provider.district ?? "",
            city: provider.city,
            postalCode: provider.postalCode ?? "",
            cancellationPolicy: provider.cancellationPolicy ?? "",
            bookingPolicy: provider.bookingPolicy ?? "",
            status: provider.status,
            reviewNote: provider.reviewNote,
            services: provider.services,
            staff: provider.staff.map((member) => ({
              id: member.id,
              name: member.name,
              role: member.role,
              serviceIds: member.services.map((s) => s.serviceId),
            })),
            resources: provider.resources,
            hours: provider.scheduleRules,
            verification: {
              businessRegistrationNo: provider.verification?.businessRegistrationNo ?? "",
              taxId: provider.verification?.taxId ?? "",
              medicalLicenseNo: provider.verification?.medicalLicenseNo ?? "",
              licenceAuthority: provider.verification?.licenceAuthority ?? "",
              contactPersonName: provider.verification?.contactPersonName ?? session.name,
              contactPersonRole: provider.verification?.contactPersonRole ?? "",
              contactPersonPhone: provider.verification?.contactPersonPhone ?? "",
              contactPersonEmail: provider.verification?.contactPersonEmail ?? session.email,
              notes: provider.verification?.notes ?? "",
            },
          }}
        />
      </main>
    </div>
  );
}
