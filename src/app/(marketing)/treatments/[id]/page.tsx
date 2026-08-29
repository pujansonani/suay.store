import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Clock, DoorOpen, MapPin, ShieldCheck, Wrench } from "lucide-react";

import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { PageTransition, Reveal } from "@/components/ui/motion";
import { ClinicAvailabilityPreview } from "@/components/booking/availability-preview";
import { getPublicService } from "@/lib/data/marketplace";
import { formatMoney } from "@/lib/money";
import { getTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getPublicService(id);
  return { title: service?.name ?? "Treatment" };
}

export default async function TreatmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getPublicService(id);
  if (!service) notFound();

  const { locale, t } = await getTranslations();

  const rooms = service.resourceRequirements.filter((r) => r.resourceType === "ROOM");
  const equipment = service.resourceRequirements.filter((r) => r.resourceType === "EQUIPMENT");

  return (
    <PageTransition>
      <div className="border-b border-line bg-surface">
        <div className="container-page py-8">
          <nav aria-label="Breadcrumb" className="mb-3 text-[0.75rem] text-ink-muted">
            <Link href="/treatments" className="hover:text-teal-600">
              Treatments
            </Link>
            <span aria-hidden className="mx-1.5">/</span>
            <Link href={`/clinics/${service.provider.slug}`} className="hover:text-teal-600">
              {service.provider.name}
            </Link>
            <span aria-hidden className="mx-1.5">/</span>
            <span className="text-ink">{service.name}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-navy-600">{service.name}</h1>
            {service.isMedicalAesthetic && <Badge tone="navy">Medical / aesthetic procedure</Badge>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Clock aria-hidden className="size-3.5 text-ink-subtle" />
              {service.durationMinutes} {t.treatment.minutes}
            </span>
            <span className="font-semibold text-navy-600 tabular">
              {service.priceMinor === 0 ? "Free" : formatMoney(service.priceMinor, service.currency, locale)}
            </span>
            {service.category && <span>{service.category.name}</span>}
          </div>
        </div>
      </div>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="text-lg font-semibold text-navy-600">About this treatment</h2>
            <p className="mt-3 max-w-2xl text-[0.875rem] leading-relaxed text-ink">
              {service.description}
            </p>
          </section>

          {service.isMedicalAesthetic && (
            <div className="flex items-start gap-2.5 rounded-md border border-[#e8d7b9] bg-warning-bg p-4">
              <AlertTriangle aria-hidden className="mt-px size-4 shrink-0 text-warning" />
              <div>
                <p className="text-[0.8125rem] font-medium text-warning">
                  This is a medical or aesthetic procedure
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-warning/90">
                  Whether it is suitable for you is decided by the clinic at consultation. Results
                  vary between individuals, and the clinic may recommend a different treatment or
                  decline to proceed.
                </p>
              </div>
            </div>
          )}

          {service.importantInfo && (
            <section>
              <h2 className="text-lg font-semibold text-navy-600">{t.treatment.importantInfo}</h2>
              <p className="mt-3 max-w-2xl text-[0.875rem] leading-relaxed text-ink">
                {service.importantInfo}
              </p>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-navy-600">{t.clinic.practitioners}</h2>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Practitioners at {service.provider.name} who perform this treatment. Credentials are
              provided by the clinic; in this demonstration environment they are fictional samples.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {service.staffLinks.map((link, index) => (
                <Reveal key={link.staff.id} index={index}>
                  <article className="h-full rounded-lg border border-line bg-surface p-4">
                    <h3 className="text-[0.9375rem] font-medium text-navy-600">{link.staff.name}</h3>
                    <p className="text-[0.8125rem] text-ink-muted">{link.staff.role}</p>
                    <dl className="mt-2.5 space-y-1 text-[0.75rem]">
                      {link.staff.yearsExperience !== null && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 text-ink-subtle">Experience</dt>
                          <dd className="text-ink">{link.staff.yearsExperience} years</dd>
                        </div>
                      )}
                      {link.staff.specializations.length > 0 && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 text-ink-subtle">Focus</dt>
                          <dd className="text-ink">{link.staff.specializations.join(", ")}</dd>
                        </div>
                      )}
                      {link.staff.languages.length > 0 && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 text-ink-subtle">Languages</dt>
                          <dd className="text-ink">{link.staff.languages.join(", ")}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          {(rooms.length > 0 || equipment.length > 0) && (
            <section>
              <h2 className="text-lg font-semibold text-navy-600">What this appointment reserves</h2>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">
                A time is only offered when everything this treatment needs is free at once.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {rooms.map((requirement, i) => (
                  <li
                    key={`room-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[0.8125rem] text-ink"
                  >
                    <DoorOpen aria-hidden className="size-3.5 text-ink-subtle" />
                    {requirement.quantity} treatment {requirement.quantity === 1 ? "room" : "rooms"}
                  </li>
                ))}
                {equipment.map((requirement, i) => (
                  <li
                    key={`equipment-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[0.8125rem] text-ink"
                  >
                    <Wrench aria-hidden className="size-3.5 text-ink-subtle" />
                    {requirement.quantity} {requirement.quantity === 1 ? "device" : "devices"}
                  </li>
                ))}
                {service.requiresStaff && (
                  <li className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[0.8125rem] text-ink">
                    <ShieldCheck aria-hidden className="size-3.5 text-ink-subtle" />1 practitioner
                  </li>
                )}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-navy-600">{t.clinic.availability}</h2>
            <div className="mt-4">
              <ClinicAvailabilityPreview
                providerId={service.provider.id}
                services={[
                  { id: service.id, name: service.name, durationMinutes: service.durationMinutes },
                ]}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24">
            <p className="text-[0.75rem] text-ink-subtle">{t.treatment.offeredBy}</p>
            <div className="mt-1 flex items-center gap-2">
              <Link
                href={`/clinics/${service.provider.slug}`}
                className="text-[0.9375rem] font-semibold text-navy-600 hover:text-teal-600"
              >
                {service.provider.name}
              </Link>
              <VerifiedBadge status={service.provider.status} />
            </div>

            <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
              <MapPin aria-hidden className="size-3.5 text-ink-subtle" />
              {service.provider.district
                ? `${service.provider.district}, ${service.provider.city}`
                : service.provider.city}
            </p>

            <div className="mt-2.5">
              <Rating value={service.provider.ratingAverage} count={service.provider.ratingCount} />
            </div>

            <dl className="mt-4 space-y-2 border-t border-line pt-3.5 text-[0.8125rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t.treatment.duration}</dt>
                <dd className="text-ink tabular">{service.durationMinutes} min</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t.treatment.price}</dt>
                <dd className="font-semibold text-navy-600 tabular">
                  {service.priceMinor === 0 ? "Free" : formatMoney(service.priceMinor, service.currency, locale)}
                </dd>
              </div>
            </dl>

            <Link
              href={`/booking/${service.id}`}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-md bg-teal-500 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-600"
            >
              {t.clinic.bookAppointment}
            </Link>

            {service.provider.cancellationPolicy && (
              <div className="mt-4 border-t border-line pt-3.5">
                <h2 className="text-[0.75rem] font-medium text-navy-600">
                  {t.treatment.cancellationPolicy}
                </h2>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-muted">
                  {service.provider.cancellationPolicy}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </PageTransition>
  );
}
