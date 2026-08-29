import { Suspense } from "react";
import Link from "next/link";

import { ClinicCard } from "@/components/marketing/clinic-card";
import { ClinicFilters, SortControl } from "@/components/marketing/clinic-filters";
import { SearchBar } from "@/components/marketing/search-bar";
import { PageTransition } from "@/components/ui/motion";
import { CardSkeleton, NoResultsState } from "@/components/ui/states";
import {
  getCategories,
  getLocations,
  nextAvailabilityForClinic,
  searchClinics,
  type SortOption,
} from "@/lib/data/marketplace";
import { getTranslations } from "@/lib/i18n/server";
import { pluralize } from "@/lib/utils";

export const metadata = { title: "Find a clinic" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClinicsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { locale } = await getTranslations();

  const query = first(params.q);
  const location = first(params.location);
  const categorySlug = first(params.category);
  const sort = (first(params.sort) ?? "recommended") as SortOption;
  const page = Number(first(params.page) ?? 1) || 1;
  const rating = Number(first(params.rating) ?? 0) || undefined;
  const maxPrice = Number(first(params.maxPrice) ?? 0) || undefined;
  const verifiedOnly = first(params.verified) === "1";

  const [result, categories, locations] = await Promise.all([
    searchClinics({
      query,
      location,
      categorySlug,
      minRating: rating,
      maxPriceMinor: maxPrice,
      verifiedOnly,
      sort,
      page,
      perPage: 12,
    }),
    getCategories(),
    getLocations(),
  ]);

  const withAvailability = await Promise.all(
    result.clinics.map(async (clinic) => ({
      clinic,
      nextAvailable: (await nextAvailabilityForClinic(clinic.id))?.startAt ?? null,
    })),
  );

  const totalLabel = `${result.total} ${pluralize(result.total, "clinic")}`;

  return (
    <PageTransition>
      <div className="border-b border-line bg-surface">
        <div className="container-page py-8">
          <h1 className="text-xl font-semibold text-navy-600 md:text-2xl">Find a clinic</h1>
          <p className="mt-1.5 max-w-2xl text-[0.8125rem] text-ink-muted">
            Only clinics that have been approved by Suay and have chosen to publish their profile
            appear here.
          </p>
          <div className="mt-5 max-w-4xl">
            <Suspense fallback={null}>
              <SearchBar
                variant="compact"
                defaultQuery={query}
                defaultLocation={location}
                locations={locations}
              />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[16rem_1fr]">
        <Suspense fallback={null}>
          <ClinicFilters
            categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
            totalLabel={totalLabel}
          />
        </Suspense>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="hidden text-[0.8125rem] text-ink-muted lg:block">
              {totalLabel}
              {query ? ` matching “${query}”` : ""}
              {location ? ` near ${location}` : ""}
            </p>
            <Suspense fallback={null}>
              <SortControl />
            </Suspense>
          </div>

          {result.clinics.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface">
              <NoResultsState
                onClear={
                  <Link
                    href="/clinics"
                    className="inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-3.5 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted"
                  >
                    Clear search and filters
                  </Link>
                }
              />
            </div>
          ) : (
            <Suspense fallback={<CardSkeleton />}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {withAvailability.map(({ clinic, nextAvailable }, index) => (
                  <ClinicCard
                    key={clinic.id}
                    clinic={clinic}
                    nextAvailable={nextAvailable}
                    index={index}
                    locale={locale}
                  />
                ))}
              </div>
            </Suspense>
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
                    href={`/clinics${target.toString() ? `?${target}` : ""}`}
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
      </div>
    </PageTransition>
  );
}
