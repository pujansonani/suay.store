import { notFound } from "next/navigation";

import { BookingFlow } from "@/components/booking/booking-flow";
import { getPublicService } from "@/lib/data/marketplace";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getTranslations } from "@/lib/i18n/server";
import { todayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const service = await getPublicService(serviceId);
  return { title: service ? `Book ${service.name}` : "Book an appointment" };
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { serviceId } = await params;
  const query = await searchParams;

  const service = await getPublicService(serviceId);
  // Unpublished, pending and suspended clinics are unreachable here too.
  if (!service) notFound();

  const { locale } = await getTranslations();
  const session = await getSession();

  // Only a customer books for themselves. A signed-in clinic or admin sees the
  // flow but is treated as a guest until they sign in with a patient account.
  const viewer =
    session?.role === "CUSTOMER"
      ? await prisma.user.findUnique({
          where: { id: session.id },
          select: { id: true, name: true, email: true, phone: true },
        })
      : null;

  const date = typeof query.date === "string" ? query.date : todayKey();
  const startAt = typeof query.time === "string" ? query.time : undefined;

  return (
    <BookingFlow
      service={{
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceMinor: service.priceMinor,
        currency: service.currency,
        isMedicalAesthetic: service.isMedicalAesthetic,
        importantInfo: service.importantInfo,
        cancellationPolicy: service.provider.cancellationPolicy,
        provider: {
          id: service.provider.id,
          name: service.provider.name,
          slug: service.provider.slug,
          district: service.provider.district,
          city: service.provider.city,
        },
        practitioners: service.staffLinks.map((link) => ({
          id: link.staff.id,
          name: link.staff.name,
          role: link.staff.role,
        })),
      }}
      viewer={viewer}
      formatPrice={
        service.priceMinor === 0 ? "Free" : formatMoney(service.priceMinor, service.currency, locale)
      }
      initialDate={date}
      initialStartAt={startAt}
    />
  );
}
