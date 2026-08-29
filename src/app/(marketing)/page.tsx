import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, ReceiptText, ShieldCheck } from "lucide-react";

import { ClinicCard } from "@/components/marketing/clinic-card";
import { SearchBar } from "@/components/marketing/search-bar";
import { PageTransition, Reveal } from "@/components/ui/motion";
import { getCategories, getLocations, nextAvailabilityForClinic, searchClinics } from "@/lib/data/marketplace";
import { getTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { locale, t } = await getTranslations();

  const [{ clinics }, categories, locations] = await Promise.all([
    searchClinics({ sort: "recommended", perPage: 6 }),
    getCategories(),
    getLocations(),
  ]);

  const withAvailability = await Promise.all(
    clinics.map(async (clinic) => ({
      clinic,
      nextAvailable: (await nextAvailabilityForClinic(clinic.id))?.startAt ?? null,
    })),
  );

  const trustPoints = [
    { icon: BadgeCheck, label: t.home.trustVerified },
    { icon: ReceiptText, label: t.home.trustPricing },
    { icon: ShieldCheck, label: t.home.trustBooking },
    { icon: CalendarCheck, label: t.home.trustProfessionals },
  ];

  return (
    <PageTransition>
      {/* Hero. One message, one search, four honest reasons to trust it. */}
      <section className="border-b border-line bg-surface">
        <div className="container-page py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="text-[0.8125rem] font-medium tracking-wide text-teal-600">
              Clinics · Aesthetics · Wellness · Thailand
            </p>
            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.15] tracking-tight text-navy-600 text-balance md:text-[2.75rem]">
              {t.home.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted md:text-base">
              {t.home.heroSubtitle}
            </p>
          </div>

          <div className="mt-8 max-w-4xl">
            <SearchBar locations={locations} />
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5">
            {trustPoints.map((point) => (
              <li key={point.label} className="flex items-center gap-2 text-[0.8125rem] text-ink-muted">
                <point.icon aria-hidden className="size-4 text-teal-500" />
                {point.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Treatment areas. */}
      {categories.length > 0 && (
        <section className="container-page py-12 md:py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-navy-600">{t.home.browseByCategory}</h2>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">
                Every treatment page lists duration, price and the clinic's policies before you book.
              </p>
            </div>
            <Link
              href="/treatments"
              className="hidden shrink-0 items-center gap-1 text-[0.8125rem] font-medium text-teal-600 hover:text-teal-700 sm:inline-flex"
            >
              {t.common.viewAll}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Reveal key={category.id} index={index}>
                <Link
                  href={`/treatments?category=${category.slug}`}
                  className="flex h-full flex-col rounded-lg border border-line bg-surface p-4 transition-[border-color,background-color] hover:border-teal-200 hover:bg-teal-50/40"
                >
                  <span className="text-[0.9375rem] font-medium text-navy-600">{category.name}</span>
                  {category.description && (
                    <span className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                      {category.description}
                    </span>
                  )}
                  <span className="mt-3 text-[0.75rem] text-ink-subtle">
                    {category._count.services}{" "}
                    {category._count.services === 1 ? "treatment" : "treatments"}
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Clinics. */}
      <section className="border-t border-line bg-surface-muted/40">
        <div className="container-page py-12 md:py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-navy-600">{t.home.featuredClinics}</h2>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">{t.home.featuredSubtitle}</p>
            </div>
            <Link
              href="/clinics"
              className="hidden shrink-0 items-center gap-1 text-[0.8125rem] font-medium text-teal-600 hover:text-teal-700 sm:inline-flex"
            >
              {t.common.viewAll}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </section>

      {/* How it works. */}
      <section className="container-page py-12 md:py-16">
        <h2 className="text-xl font-semibold text-navy-600">{t.home.howTitle}</h2>
        <ol className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { title: t.home.howStep1Title, body: t.home.howStep1Body },
            { title: t.home.howStep2Title, body: t.home.howStep2Body },
            { title: t.home.howStep3Title, body: t.home.howStep3Body },
          ].map((step, index) => (
            <li key={step.title} className="border-t-2 border-teal-500 pt-4">
              <span className="text-[0.75rem] font-semibold text-teal-600 tabular">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1.5 text-[0.9375rem] font-semibold text-navy-600">{step.title}</h3>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* For clinics. */}
      <section className="border-t border-line bg-navy-600">
        <div className="container-page flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-white">Run your clinic on Suay</h2>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-navy-100">
              Manage your calendar, practitioners, treatment rooms and equipment in one place — and
              reach new patients once your clinic is verified.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href="/clinic/register"
              className="inline-flex h-11 items-center justify-center rounded-md bg-teal-500 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-400"
            >
              Register your clinic
            </Link>
            <Link
              href="/for-clinics"
              className="inline-flex h-11 items-center justify-center rounded-md border border-navy-400 px-5 text-sm font-medium text-white transition-colors hover:bg-navy-500"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
