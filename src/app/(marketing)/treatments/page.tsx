import { Suspense } from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { PageTransition, Reveal } from "@/components/ui/motion";
import { EmptyState } from "@/components/ui/states";
import { TreatmentFilters } from "@/components/marketing/treatment-filters";
import { getCategories, searchTreatments } from "@/lib/data/marketplace";
import { formatPriceOrFree } from "@/lib/money";
import { getTranslations } from "@/lib/i18n/server";
import { pluralize } from "@/lib/utils";

export const metadata = { title: "Treatments" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { locale, t } = await getTranslations();

  const query = first(params.q);
  const categorySlug = first(params.category);
  const sort = (first(params.sort) ?? "recommended") as "recommended" | "price_asc" | "price_desc" | "rating";
  const maxPrice = Number(first(params.maxPrice) ?? 0) || undefined;
  const page = Number(first(params.page) ?? 1) || 1;

  const [result, categories] = await Promise.all([
    searchTreatments({ query, categorySlug, maxPriceMinor: maxPrice, sort, page, perPage: 18 }),
    getCategories(),
  ]);

  const activeCategory = categories.find((c) => c.slug === categorySlug);

  return (
    <PageTransition>
      <div className="border-b border-line bg-surface">
        <div className="container-page py-8">
          <h1 className="text-xl font-semibold text-navy-600 md:text-2xl">
            {activeCategory ? activeCategory.name : t.nav.treatments}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[0.8125rem] text-ink-muted">
            {activeCategory?.description ??
              "Every treatment shows its duration, its price and the clinic offering it. Nothing is added at checkout."}
          </p>
        </div>
      </div>

      <div className="container-page py-8">
        <Suspense fallback={null}>
          <TreatmentFilters
            categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
            total={`${result.total} ${pluralize(result.total, "treatment")}`}
          />
        </Suspense>

        {result.services.length === 0 ? (
          <div className="mt-6 rounded-lg border border-line bg-surface">
            <EmptyState
              title="No treatments match your search"
              description="Try a different treatment area, or remove the price filter."
              action={
                <Link
                  href="/treatments"
                  className="inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-3.5 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted"
                >
                  Clear filters
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.services.map((service, index) => (
              <Reveal key={service.id} index={index} className="h-full">
                <article className="flex h-full flex-col rounded-lg border border-line bg-surface p-4 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-[0.9375rem] font-medium leading-snug text-navy-600">
                      <Link href={`/treatments/${service.id}`} className="transition-colors hover:text-teal-600">
                        {service.name}
                      </Link>
                    </h2>
                    {service.isMedicalAesthetic && <Badge tone="navy">Medical</Badge>}
                  </div>

                  {service.description && (
                    <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                      {service.description}
                    </p>
                  )}

                  <p className="mt-2.5 flex items-center gap-1.5 text-[0.75rem] text-ink-subtle">
                    <Clock aria-hidden className="size-3.5" />
                    {service.durationMinutes} {t.treatment.minutes}
                    {service.category && <span>· {service.category.name}</span>}
                  </p>

                  <div className="mt-auto border-t border-line pt-3">
                    <div className="mt-1 flex items-center gap-2">
                      <Link
                        href={`/clinics/${service.provider.slug}`}
                        className="truncate text-[0.8125rem] font-medium text-navy-600 hover:text-teal-600"
                      >
                        {service.provider.name}
                      </Link>
                      <VerifiedBadge status={service.provider.status} />
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
                      <MapPin aria-hidden className="size-3" />
                      {service.provider.district
                        ? `${service.provider.district}, ${service.provider.city}`
                        : service.provider.city}
                    </p>

                    <div className="mt-2">
                      <Rating value={service.provider.ratingAverage} count={service.provider.ratingCount} />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[0.9375rem] font-semibold text-navy-600 tabular">
                        {formatPriceOrFree(service.priceMinor, service.currency, locale)}
                      </span>
                      <Link
                        href={`/booking/${service.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-teal-500 bg-teal-500 px-4 text-[0.8125rem] font-medium text-white transition-colors hover:bg-teal-600"
                      >
                        {t.clinic.book}
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}

        {result.totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: result.totalPages }).map((_, i) => {
              const target = new URLSearchParams();
              for (const [key, value] of Object.entries(params)) {
                const v = first(value);
                if (v && key !== "page") target.set(key, v);
              }
              if (i > 0) target.set("page", String(i + 1));
              const isCurrent = result.page === i + 1;
              return (
                <Link
                  key={i}
                  href={`/treatments${target.toString() ? `?${target}` : ""}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={
                    isCurrent
                      ? "inline-flex size-9 items-center justify-center rounded-md border border-teal-500 bg-teal-500 text-[0.8125rem] font-medium text-white"
                      : "inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-[0.8125rem] text-ink-muted transition-colors hover:bg-surface-muted"
                  }
                >
                  {i + 1}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </PageTransition>
  );
}
