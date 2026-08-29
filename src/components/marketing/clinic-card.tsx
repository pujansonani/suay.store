import Link from "next/link";
import { CalendarCheck, MapPin } from "lucide-react";

import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { Reveal } from "@/components/ui/motion";
import { formatMoneyShort } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n";
import type { ClinicCardData } from "@/lib/data/marketplace";
import { dateKeyOf, todayKey } from "@/lib/time";

export interface ClinicCardProps {
  clinic: ClinicCardData;
  nextAvailable?: string | null;
  index?: number;
  locale?: Locale;
}

export function ClinicCard({ clinic, nextAvailable, index = 0, locale = "en" }: ClinicCardProps) {
  const location = clinic.district ? `${clinic.district}, ${clinic.city}` : clinic.city;

  return (
    <Reveal index={index} className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-[var(--shadow-raised)]">
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-muted">
          {clinic.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinic.coverImageUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div aria-hidden className="flex size-full items-center justify-center bg-navy-50 text-navy-200">
              <span className="text-2xl font-semibold">{clinic.name.slice(0, 1)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[0.9375rem] font-semibold leading-snug text-navy-600">
              <Link href={`/clinics/${clinic.slug}`} className="transition-colors hover:text-teal-600">
                {clinic.name}
              </Link>
            </h3>
            <VerifiedBadge status={clinic.status} className="shrink-0" />
          </div>

          {clinic.specialty && (
            <p className="mt-1 text-[0.8125rem] text-ink-muted">{clinic.specialty}</p>
          )}

          <div className="mt-2.5">
            <Rating value={clinic.ratingAverage} count={clinic.ratingCount} />
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
            <MapPin aria-hidden className="size-3.5 shrink-0 text-ink-subtle" />
            {location}
          </p>

          <div className="mt-auto space-y-3 pt-4">
            <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
              <div>
                <p className="text-[0.6875rem] text-ink-subtle">From</p>
                <p className="text-[0.9375rem] font-semibold text-navy-600 tabular">
                  {clinic.fromPriceMinor !== null
                    ? formatMoneyShort(clinic.fromPriceMinor, clinic.currency, locale)
                    : "—"}
                </p>
              </div>

              {nextAvailable ? (
                <div className="text-right">
                  <p className="text-[0.6875rem] text-ink-subtle">Next available</p>
                  <p className="flex items-center gap-1 text-[0.8125rem] font-medium text-success">
                    <CalendarCheck aria-hidden className="size-3.5" />
                    {dateKeyOf(new Date(nextAvailable)) === todayKey()
                      ? "Today"
                      : formatDate(nextAvailable, locale, { day: "numeric", month: "short" })}{" "}
                    · {formatTime(nextAvailable, locale)}
                  </p>
                </div>
              ) : (
                <Badge tone="neutral">No online availability</Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                href={`/clinics/${clinic.slug}`}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-line-strong bg-surface px-3 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted"
              >
                View clinic
              </Link>
              <Link
                href={`/clinics/${clinic.slug}#treatments`}
                className="inline-flex h-9 items-center justify-center rounded-md border border-teal-500 bg-teal-500 px-4 text-[0.8125rem] font-medium text-white transition-colors hover:bg-teal-600"
              >
                Book
              </Link>
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
