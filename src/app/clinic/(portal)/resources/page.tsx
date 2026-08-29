import { PageHeader } from "@/components/clinic/page-header";
import { ResourcesManager } from "@/components/clinic/resources-manager";
import { PageTransition } from "@/components/ui/motion";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicResources } from "@/lib/data/clinic";

export const metadata = { title: "Rooms & equipment" };
export const dynamic = "force-dynamic";

export default async function ClinicResourcesPage() {
  const session = await requireClinicPage("/clinic/resources");
  const resources = await getClinicResources(session.providerId!);

  return (
    <PageTransition>
      <PageHeader
        title="Rooms & equipment"
        description="Real capacity, not a list. If a treatment needs a laser room and a laser unit, Suay only offers a time when both are free."
      />

      <ResourcesManager
        resources={resources.map((resource) => ({
          id: resource.id,
          name: resource.name,
          type: resource.type,
          tag: resource.tag,
          notes: resource.notes,
          active: resource.active,
          usageCount: resource._count.bookingAssignments,
        }))}
      />
    </PageTransition>
  );
}
