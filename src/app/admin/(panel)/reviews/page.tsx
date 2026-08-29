import Link from "next/link";
import { Star } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { Pagination } from "@/components/admin/pagination";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { PageTransition } from "@/components/ui/motion";
import { EmptyState } from "@/components/ui/states";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminReviews } from "@/lib/data/admin";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/reviews");
  const params = await searchParams;
  const { locale } = await getTranslations();
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page ?? 1) || 1;

  const result = await getAdminReviews(page);

  return (
    <PageTransition>
      <PageHeader
        title="Reviews"
        description="Moderation changes visibility only — the review text is never edited, so a removal can be reversed."
      />

      {result.reviews.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={Star} title="No reviews" description="No reviews have been left yet." />
        </div>
      ) : (
        <ReviewModeration
          locale={locale}
          reviews={result.reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            status: review.status,
            isSample: review.isSample,
            createdAt: review.createdAt.toISOString(),
            customerName: review.customer.name,
            providerId: review.provider.id,
            providerName: review.provider.name,
            reference: review.booking.reference,
          }))}
        />
      )}

      <Pagination basePath="/admin/reviews" params={params} page={result.page} totalPages={result.totalPages} />
    </PageTransition>
  );
}
