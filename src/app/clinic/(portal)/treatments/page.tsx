import { PageHeader } from "@/components/clinic/page-header";
import { TreatmentsManager } from "@/components/clinic/treatments-manager";
import { PageTransition } from "@/components/ui/motion";
import { requireClinicPage } from "@/lib/auth/routes";
import {
  getCategoryOptions,
  getClinicResources,
  getClinicServices,
  getClinicStaff,
} from "@/lib/data/clinic";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Treatments" };
export const dynamic = "force-dynamic";

export default async function ClinicTreatmentsPage() {
  const session = await requireClinicPage("/clinic/treatments");
  const providerId = session.providerId!;
  const { locale } = await getTranslations();

  const [services, staff, resources, categories] = await Promise.all([
    getClinicServices(providerId),
    getClinicStaff(providerId),
    getClinicResources(providerId),
    getCategoryOptions(),
  ]);

  // Offer the tags this clinic actually has, so a requirement cannot be set
  // against equipment that does not exist.
  const tagCounts = new Map<string, { tag: string; type: "ROOM" | "EQUIPMENT"; count: number }>();
  for (const resource of resources) {
    if (!resource.active || !resource.tag) continue;
    const key = `${resource.type}:${resource.tag}`;
    const existing = tagCounts.get(key);
    if (existing) existing.count += 1;
    else tagCounts.set(key, { tag: resource.tag, type: resource.type, count: 1 });
  }

  return (
    <PageTransition>
      <PageHeader
        title="Treatments"
        description="What you offer, how long it takes and what it costs. Availability is generated from the duration, turnaround time and the rooms or equipment each treatment needs."
      />

      <TreatmentsManager
        locale={locale}
        categories={categories}
        resourceTags={[...tagCounts.values()]}
        staff={staff
          .filter((member) => member.active)
          .map((member) => ({ id: member.id, name: member.name, role: member.role }))}
        treatments={services.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          importantInfo: service.importantInfo,
          durationMinutes: service.durationMinutes,
          bufferBeforeMinutes: service.bufferBeforeMinutes,
          bufferAfterMinutes: service.bufferAfterMinutes,
          priceMinor: service.priceMinor,
          currency: service.currency,
          serviceClass: service.serviceClass,
          isMedicalAesthetic: service.isMedicalAesthetic,
          requiresStaff: service.requiresStaff,
          active: service.active,
          categoryId: service.categoryId,
          categoryName: service.category?.name ?? null,
          staffIds: service.staffLinks.map((link) => link.staffId),
          requirements: service.resourceRequirements.map((r) => ({
            resourceType: r.resourceType,
            resourceTag: r.resourceTag,
            quantity: r.quantity,
          })),
          bookingCount: service._count.bookings,
        }))}
      />
    </PageTransition>
  );
}
