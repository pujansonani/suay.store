import { PageHeader } from "@/components/clinic/page-header";
import { PractitionersManager } from "@/components/clinic/practitioners-manager";
import { PageTransition } from "@/components/ui/motion";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicServices, getClinicStaff } from "@/lib/data/clinic";

export const metadata = { title: "Practitioners" };
export const dynamic = "force-dynamic";

export default async function ClinicPractitionersPage() {
  const session = await requireClinicPage("/clinic/practitioners");
  const providerId = session.providerId!;

  const [staff, services] = await Promise.all([
    getClinicStaff(providerId),
    getClinicServices(providerId),
  ]);

  return (
    <PageTransition>
      <PageHeader
        title="Practitioners"
        description="Who works at your clinic and what each person performs. Availability is generated from this and from each practitioner's shifts."
      />

      <PractitionersManager
        services={services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))}
        practitioners={staff.map((member) => ({
          id: member.id,
          name: member.name,
          role: member.role,
          bio: member.bio,
          credentials: member.credentials,
          qualifications: member.qualifications,
          specializations: member.specializations,
          languages: member.languages,
          yearsExperience: member.yearsExperience,
          verified: member.verified,
          active: member.active,
          serviceIds: member.services.map((s) => s.serviceId),
          bookingCount: member._count.bookings,
        }))}
      />
    </PageTransition>
  );
}
