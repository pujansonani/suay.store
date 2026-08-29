import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CircleDollarSign,
  Star,
  TrendingDown,
} from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { StatTile } from "@/components/clinic/stat-tile";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookingStatusPill } from "@/components/ui/status";
import { Rating } from "@/components/ui/rating";
import { EmptyState } from "@/components/ui/states";
import { PageTransition } from "@/components/ui/motion";
import { Badge } from "@/components/ui/badge";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicDashboard } from "@/lib/data/clinic";
import { formatMoneyShort } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Clinic dashboard" };
export const dynamic = "force-dynamic";

export default async function ClinicDashboardPage() {
  const session = await requireClinicPage("/clinic/dashboard");
  const { locale } = await getTranslations();

  // Scoped to the authenticated clinic — these numbers are never platform-wide.
  const data = await getClinicDashboard(session.providerId!);
  const currency = data.provider?.currency ?? "THB";

  return (
    <PageTransition>
      <PageHeader
        title="Dashboard"
        description={`Today at ${data.provider?.name ?? "your clinic"}. Every figure on this page covers your clinic only.`}
      />

      {!data.provider?.published && (
        <div className="mb-6 flex items-start gap-2.5 rounded-md border border-[#e8d7b9] bg-warning-bg p-4">
          <AlertTriangle aria-hidden className="mt-px size-4 shrink-0 text-warning" />
          <div>
            <p className="text-[0.8125rem] font-medium text-warning">
              Your clinic is not visible to patients
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-warning/90">
              You are approved but not published. Publish from{" "}
              <Link href="/clinic/profile" className="font-medium underline underline-offset-2">
                your clinic profile
              </Link>{" "}
              when you are ready to take marketplace bookings.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Today's appointments"
          value={String(data.metrics.todayCount)}
          hint={formatDate(new Date(), locale, { weekday: "long", day: "numeric", month: "long" })}
          icon={CalendarDays}
        />
        <StatTile
          label="Upcoming (confirmed)"
          value={String(data.metrics.upcomingCount)}
          hint="From tomorrow onwards"
          icon={CalendarCheck}
        />
        <StatTile
          label="Completed"
          value={String(data.metrics.completedCount)}
          hint="Last 30 days"
          icon={CalendarCheck}
        />
        <StatTile
          label="Revenue"
          value={formatMoneyShort(data.metrics.revenueMinor, currency, locale)}
          hint="Captured, less refunds · last 30 days"
          icon={CircleDollarSign}
        />
        <StatTile
          label="Cancellation rate"
          value={`${data.metrics.cancellationRate}%`}
          hint="Cancelled or no-show · last 30 days"
          icon={TrendingDown}
          tone={data.metrics.cancellationRate > 20 ? "attention" : "default"}
        />
        <StatTile
          label="Rating"
          value={data.metrics.ratingCount > 0 ? data.metrics.ratingAverage.toFixed(1) : "—"}
          hint={
            data.metrics.ratingCount > 0
              ? `${data.metrics.ratingCount} ${data.metrics.ratingCount === 1 ? "review" : "reviews"}`
              : "No reviews yet"
          }
          icon={Star}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Today's schedule</CardTitle>
              <CardDescription>
                {formatDate(new Date(), locale, { weekday: "long", day: "numeric", month: "long" })}
              </CardDescription>
            </div>
            <Link
              href="/clinic/calendar"
              className="shrink-0 text-[0.8125rem] font-medium text-teal-600 hover:text-teal-700"
            >
              Open calendar
            </Link>
          </CardHeader>

          {data.todayBookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing booked today"
              description="Appointments booked through Suay and entered at your front desk both appear here."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.todayBookings.map((booking) => (
                <li key={booking.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-14 shrink-0 text-[0.8125rem] font-semibold text-navy-600 tabular">
                    {formatTime(booking.startAt, locale)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-medium text-ink">
                      {booking.customerName}
                    </p>
                    <p className="truncate text-[0.75rem] text-ink-muted">
                      {booking.service.name}
                      {booking.staff && ` · ${booking.staff.name}`}
                    </p>
                  </div>
                  <BookingStatusPill status={booking.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Next appointments</CardTitle>
                <CardDescription>Confirmed, from tomorrow</CardDescription>
              </div>
            </CardHeader>

            {data.upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No upcoming appointments"
                description="Once patients book, they will appear here."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.upcoming.map((booking) => (
                  <li key={booking.id} className="px-5 py-3">
                    <p className="text-[0.75rem] text-ink-muted tabular">
                      {formatDate(booking.startAt, locale, { day: "numeric", month: "short" })} ·{" "}
                      {formatTime(booking.startAt, locale)}
                    </p>
                    <p className="mt-0.5 truncate text-[0.8125rem] font-medium text-ink">
                      {booking.customerName}
                    </p>
                    <p className="truncate text-[0.75rem] text-ink-muted">
                      {booking.service.name}
                      {booking.staff && ` · ${booking.staff.name}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent reviews</CardTitle>
                <CardDescription>From completed appointments</CardDescription>
              </div>
              <Link
                href="/clinic/reviews"
                className="shrink-0 text-[0.8125rem] font-medium text-teal-600 hover:text-teal-700"
              >
                All
              </Link>
            </CardHeader>

            {data.recentReviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="No reviews yet"
                description="Patients can review a clinic once their appointment is complete."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.recentReviews.map((review) => (
                  <li key={review.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Rating value={review.rating} count={1} showCount={false} />
                      {review.isSample && <Badge tone="neutral">Sample</Badge>}
                    </div>
                    {review.comment && (
                      <p className="mt-1.5 line-clamp-2 text-[0.8125rem] text-ink-muted">
                        {review.comment}
                      </p>
                    )}
                    <p className="mt-1 text-[0.75rem] text-ink-subtle">
                      {review.customer.name} · {formatDate(review.createdAt, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
