import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { PageTransition, Reveal } from "@/components/ui/motion";
import { EmptyState } from "@/components/ui/states";
import { ClinicAvailabilityPreview } from "@/components/booking/availability-preview";
import { getPublicClinic } from "@/lib/data/marketplace";
import { formatMoneyShort, formatPriceOrFree } from "@/lib/money";
import { formatDate } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";
import { minutesToLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "treatments", label: "Treatments" },
  { id: "practitioners", label: "Practitioners" },
  { id: "credentials", label: "Credentials" },
  { id: "availability", label: "Availability" },
  { id: "reviews", label: "Reviews" },
  { id: "information", label: "Clinic information" },
  { id: "policies", label: "Policies" },
];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clinic = await getPublicClinic(slug);
  return { title: clinic?.name ?? "Clinic" };
}

export default async function ClinicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clinic = await getPublicClinic(slug);

  // A pending, rejected, suspended or unpublished clinic is simply not here.
  if (!clinic) notFound();

  const { locale, t } = await getTranslations();

  const hoursByDay = new Map<number, string[]>();
  for (const rule of clinic.scheduleRules) {
    hoursByDay.set(rule.dayOfWeek, [
      ...(hoursByDay.get(rule.dayOfWeek) ?? []),
      `${minutesToLabel(rule.startMinute)}–${minutesToLabel(rule.endMinute)}`,
    ]);
  }

  const address = [clinic.addressLine1, clinic.district, clinic.city, clinic.postalCode]
    .filter(Boolean)
    .join(", ");

  const cheapest = clinic.services.filter((s) => s.priceMinor > 0)[0] ?? clinic.services[0];
  const bookableService = clinic.services[0];

  return (
    <PageTransition>
      {/* Header */}
      <div className="border-b border-line bg-surface">
        <div className="relative h-40 w-full overflow-hidden bg-navy-50 md:h-56">
          {clinic.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clinic.coverImageUrl} alt="" className="size-full object-cover" />
          )}
        </div>

        <div className="container-page py-6">
          <nav aria-label="Breadcrumb" className="mb-3 text-[0.75rem] text-ink-muted">
            <Link href="/clinics" className="hover:text-teal-600">
              Clinics
            </Link>
            <span aria-hidden className="mx-1.5">
              /
            </span>
            <span className="text-ink">{clinic.name}</span>
          </nav>

          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-semibold text-navy-600">{clinic.name}</h1>
                <VerifiedBadge status={clinic.status} label={t.clinic.verifiedClinic} />
              </div>

              {clinic.specialty && <p className="mt-1 text-[0.875rem] text-ink-muted">{clinic.specialty}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-ink-muted">
                <Rating value={clinic.ratingAverage} count={clinic.ratingCount} size="md" />
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-3.5 text-ink-subtle" />
                  {clinic.district ? `${clinic.district}, ${clinic.city}` : clinic.city}
                </span>
                {clinic.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone aria-hidden className="size-3.5 text-ink-subtle" />
                    {clinic.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 rounded-lg border border-line bg-canvas/60 p-4 md:w-64">
              {cheapest && (
                <p className="text-[0.75rem] text-ink-muted">
                  Treatments from{" "}
                  <span className="font-semibold text-navy-600">
                    {formatMoneyShort(cheapest.priceMinor, clinic.currency, locale)}
                  </span>
                </p>
              )}
              {bookableService && (
                <Link
                  href={`/booking/${bookableService.id}`}
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-md bg-teal-500 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                >
                  {t.clinic.bookAppointment}
                </Link>
              )}
              <p className="mt-2.5 flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-ink-muted">
                <ShieldCheck aria-hidden className="mt-px size-3.5 shrink-0 text-teal-500" />
                Your time slot is held while you pay, and the clinic's cancellation policy is shown
                before you confirm.
              </p>
            </div>
          </div>
        </div>

        {/* Section navigation. Plain anchors, so it works without JavaScript. */}
        <nav aria-label="Sections" className="border-t border-line">
          <div className="container-page flex gap-1 overflow-x-auto py-1">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="shrink-0 rounded-md px-3 py-2 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-navy-600"
              >
                {section.label}
              </a>
            ))}
          </div>
        </nav>
      </div>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-12">
          {/* About */}
          <section id="about" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-navy-600">{t.clinic.about}</h2>
            <p className="mt-3 max-w-2xl whitespace-pre-line text-[0.875rem] leading-relaxed text-ink">
              {clinic.description}
            </p>
          </section>

          {/* Treatments */}
          <section id="treatments" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-navy-600">{t.clinic.treatmentsSection}</h2>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Duration and price are shown in full. Nothing is added at checkout.
            </p>

            {clinic.services.length === 0 ? (
              <div className="mt-4 rounded-lg border border-line bg-surface">
                <EmptyState title="No treatments listed" description="This clinic has not published its treatment list yet." />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {clinic.services.map((service, index) => (
                  <li key={service.id}>
                    <Reveal index={index}>
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[0.9375rem] font-medium text-navy-600">
                              <Link href={`/treatments/${service.id}`} className="hover:text-teal-600">
                                {service.name}
                              </Link>
                            </h3>
                            {service.isMedicalAesthetic && (
                              <Badge tone="navy">Medical / aesthetic</Badge>
                            )}
                          </div>
                          {service.description && (
                            <p className="mt-1 max-w-xl text-[0.8125rem] leading-relaxed text-ink-muted">
                              {service.description}
                            </p>
                          )}
                          <p className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] text-ink-subtle">
                            <Clock aria-hidden className="size-3.5" />
                            {service.durationMinutes} {t.treatment.minutes}
                            {service.category && <span>· {service.category.name}</span>}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                          <p className="text-[0.9375rem] font-semibold text-navy-600 tabular">
                            {formatPriceOrFree(service.priceMinor, service.currency, locale)}
                          </p>
                          <Link
                            href={`/booking/${service.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-teal-500 bg-teal-500 px-4 text-[0.8125rem] font-medium text-white transition-colors hover:bg-teal-600"
                          >
                            {t.clinic.book}
                          </Link>
                        </div>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Practitioners */}
          <section id="practitioners" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-navy-600">{t.clinic.practitioners}</h2>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Practitioner details are provided by the clinic. In this demonstration environment all
              credentials shown are fictional sample records.
            </p>

            {clinic.staff.length === 0 ? (
              <div className="mt-4 rounded-lg border border-line bg-surface">
                <EmptyState title="No practitioners listed" description="This clinic has not published practitioner details." />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {clinic.staff.map((member, index) => (
                  <Reveal key={member.id} index={index}>
                    <article className="h-full rounded-lg border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[0.9375rem] font-medium text-navy-600">{member.name}</h3>
                          <p className="text-[0.8125rem] text-ink-muted">{member.role}</p>
                        </div>
                        {member.verified && (
                          <Badge tone="teal">
                            <BadgeCheck aria-hidden className="size-3" />
                            Checked by clinic
                          </Badge>
                        )}
                      </div>

                      {member.bio && (
                        <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink">{member.bio}</p>
                      )}

                      <dl className="mt-3 space-y-1.5 text-[0.75rem]">
                        {member.yearsExperience !== null && (
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-ink-subtle">Experience</dt>
                            <dd className="text-ink">{member.yearsExperience} years</dd>
                          </div>
                        )}
                        {member.specializations.length > 0 && (
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-ink-subtle">Focus</dt>
                            <dd className="text-ink">{member.specializations.join(", ")}</dd>
                          </div>
                        )}
                        {member.languages.length > 0 && (
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-ink-subtle">Languages</dt>
                            <dd className="text-ink">{member.languages.join(", ")}</dd>
                          </div>
                        )}
                        {member.qualifications.length > 0 && (
                          <div className="flex gap-2">
                            <dt className="w-24 shrink-0 text-ink-subtle">Qualifications</dt>
                            <dd className="text-ink">{member.qualifications.join("; ")}</dd>
                          </div>
                        )}
                      </dl>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}
          </section>

          {/* Credentials */}
          <section id="credentials" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-navy-600">{t.clinic.credentials}</h2>
            <div className="mt-4 rounded-lg border border-line bg-surface p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-teal-500" />
                <div>
                  <p className="text-[0.875rem] font-medium text-navy-600">
                    {clinic.verification?.status === "APPROVED"
                      ? "Business and licence details checked by Suay"
                      : "Verification in progress"}
                  </p>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                    {clinic.verification?.status === "APPROVED"
                      ? "Suay checked this clinic's registered business details and licence references before publishing the profile."
                      : "This clinic has submitted its details and is awaiting review."}
                    {clinic.verification?.reviewedAt && (
                      <> Last reviewed on {formatDate(clinic.verification.reviewedAt, locale)}.</>
                    )}
                  </p>
                  <p className="mt-2 text-[0.75rem] text-ink-subtle">
                    Verification confirms the clinic's identity and registration. It is not a clinical
                    endorsement, and it does not guarantee any treatment outcome.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Availability */}
          <section id="availability" className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-navy-600">{t.clinic.availability}</h2>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Live availability, taking into account the clinic's hours, its practitioners and its
              treatment rooms.
            </p>
            {bookableService ? (
              <div className="mt-4">
                <ClinicAvailabilityPreview
                  providerId={clinic.id}
                  services={clinic.services.map((s) => ({
                    id: s.id,
                    name: s.name,
                    durationMinutes: s.durationMinutes,
                  }))}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-line bg-surface">
                <EmptyState title="No online booking" description="This clinic does not offer online booking yet." />
              </div>
            )}
          </section>

          {/* Reviews */}
          <section id="reviews" className="scroll-mt-24">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold text-navy-600">{t.clinic.reviewsSection}</h2>
              <Rating value={clinic.ratingAverage} count={clinic.ratingCount} />
            </div>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Reviews can only be written by someone whose appointment at this clinic was completed.
            </p>

            {clinic.reviews.length === 0 ? (
              <div className="mt-4 rounded-lg border border-line bg-surface">
                <EmptyState title="No reviews yet" description="This clinic has not received any reviews on Suay." />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {clinic.reviews.map((review, index) => (
                  <li key={review.id}>
                    <Reveal index={index}>
                      <article className="rounded-lg border border-line bg-surface p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <Rating value={review.rating} count={1} showCount={false} />
                            <span className="text-[0.8125rem] font-medium text-navy-600">
                              {review.customer.name}
                            </span>
                            {review.isSample && <Badge tone="neutral">Sample review</Badge>}
                          </div>
                          <span className="text-[0.75rem] text-ink-subtle">
                            {formatDate(review.createdAt, locale)}
                          </span>
                        </div>
                        {review.booking.service && (
                          <p className="mt-1 text-[0.75rem] text-ink-subtle">
                            {review.booking.service.name}
                          </p>
                        )}
                        {review.comment && (
                          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink">{review.comment}</p>
                        )}
                        {review.providerReply && (
                          <div className="mt-3 border-l-2 border-teal-200 pl-3">
                            <p className="text-[0.75rem] font-medium text-navy-600">
                              Reply from {clinic.name}
                            </p>
                            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                              {review.providerReply}
                            </p>
                          </div>
                        )}
                      </article>
                    </Reveal>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section id="information" className="scroll-mt-24 rounded-lg border border-line bg-surface p-5">
            <h2 className="text-[0.9375rem] font-semibold text-navy-600">{t.clinic.information}</h2>
            <dl className="mt-3 space-y-3 text-[0.8125rem]">
              <div>
                <dt className="flex items-center gap-1.5 text-ink-subtle">
                  <MapPin aria-hidden className="size-3.5" /> {t.clinic.location}
                </dt>
                <dd className="mt-0.5 text-ink">{address}</dd>
              </div>
              {clinic.phone && (
                <div>
                  <dt className="flex items-center gap-1.5 text-ink-subtle">
                    <Phone aria-hidden className="size-3.5" /> Phone
                  </dt>
                  <dd className="mt-0.5 text-ink">{clinic.phone}</dd>
                </div>
              )}
              {clinic.email && (
                <div>
                  <dt className="flex items-center gap-1.5 text-ink-subtle">
                    <Mail aria-hidden className="size-3.5" /> Email
                  </dt>
                  <dd className="mt-0.5 break-all text-ink">{clinic.email}</dd>
                </div>
              )}
              {clinic.website && (
                <div>
                  <dt className="flex items-center gap-1.5 text-ink-subtle">
                    <Globe aria-hidden className="size-3.5" /> Website
                  </dt>
                  <dd className="mt-0.5 break-all text-ink">{clinic.website}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-[0.9375rem] font-semibold text-navy-600">{t.clinic.openingHours}</h2>
            <dl className="mt-3 space-y-1.5 text-[0.8125rem]">
              {WEEKDAYS.map((day, index) => {
                const periods = hoursByDay.get(index);
                return (
                  <div key={day} className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-muted">{day}</dt>
                    <dd className={periods ? "text-right text-ink tabular" : "text-ink-subtle"}>
                      {periods ? periods.join(", ") : t.clinic.closed}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-3 border-t border-line pt-2.5 text-[0.6875rem] text-ink-subtle">
              All times are shown in the clinic's local time ({clinic.timezone}).
            </p>
          </section>

          <section id="policies" className="scroll-mt-24 rounded-lg border border-line bg-surface p-5">
            <h2 className="text-[0.9375rem] font-semibold text-navy-600">{t.clinic.policies}</h2>
            {clinic.cancellationPolicy && (
              <div className="mt-3">
                <h3 className="text-[0.75rem] font-medium text-ink">Cancellation</h3>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                  {clinic.cancellationPolicy}
                </p>
              </div>
            )}
            {clinic.bookingPolicy && (
              <div className="mt-3.5">
                <h3 className="text-[0.75rem] font-medium text-ink">Before your appointment</h3>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                  {clinic.bookingPolicy}
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </PageTransition>
  );
}
