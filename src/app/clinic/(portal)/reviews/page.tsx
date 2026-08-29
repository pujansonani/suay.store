import { PageHeader } from "@/components/clinic/page-header";
import { ReviewsList } from "@/components/clinic/reviews-list";
import { PageTransition } from "@/components/ui/motion";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicReviews } from "@/lib/data/clinic";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function ClinicReviewsPage() {
  const session = await requireClinicPage("/clinic/reviews");
  const { locale } = await getTranslations();
  const reviews = await getClinicReviews(session.providerId!);

  return (
    <PageTransition>
      <PageHeader
        title="Reviews"
        description="Left by patients whose appointments were completed. You can reply publicly, but ratings and review text cannot be edited or removed by a clinic."
      />

      <ReviewsList
        locale={locale}
        reviews={reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          status: review.status,
          isSample: review.isSample,
          providerReply: review.providerReply,
          createdAt: review.createdAt.toISOString(),
          customerName: review.customer.name,
          serviceName: review.booking.service.name,
          reference: review.booking.reference,
        }))}
      />
    </PageTransition>
  );
}
