import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  ShieldAlert,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { StatTile } from "@/components/clinic/stat-tile";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProviderStatusPill } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/states";
import { PageTransition } from "@/components/ui/motion";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminOverview } from "@/lib/data/admin";
import { formatMoneyShort } from "@/lib/money";
import { formatDate, formatRelative } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdminPage("/admin");
  const { locale } = await getTranslations();
  const data = await getAdminOverview();

  return (
    <PageTransition>
      <PageHeader
        title="Platform overview"
        description="Every clinic, booking and payment on Suay. Figures here are platform-wide."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Clinics"
          value={String(data.providers.total)}
          hint={`${data.providers.approved} approved · ${data.providers.suspended} suspended`}
          icon={Building2}
        />
        <StatTile
          label="Awaiting verification"
          value={String(data.providers.pending)}
          hint="Applications needing a decision"
          icon={ClipboardCheck}
          tone={data.providers.pending > 0 ? "attention" : "default"}
        />
        <StatTile
          label="Patients"
          value={String(data.users.customers)}
          hint={`${data.users.clinicUsers} clinic users · ${data.users.admins} admins`}
          icon={Users}
        />
        <StatTile
          label="Appointments today"
          value={String(data.bookings.today)}
          hint={`${data.bookings.month} in the last 30 days`}
          icon={CalendarDays}
        />
        <StatTile
          label="Payments captured"
          value={formatMoneyShort(data.revenueMinor, "THB", locale)}
          hint="Last 30 days, less refunds"
          icon={CircleDollarSign}
        />
        <StatTile
          label="Open moderation"
          value={String(data.openModeration)}
          hint="Reports awaiting review"
          icon={ShieldAlert}
          tone={data.openModeration > 0 ? "attention" : "default"}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Verification queue</CardTitle>
              <CardDescription>Clinics waiting for a decision, oldest first</CardDescription>
            </div>
            <Link
              href="/admin/verification"
              className="shrink-0 text-[0.8125rem] font-medium text-teal-600 hover:text-teal-700"
            >
              Open queue
            </Link>
          </CardHeader>

          {data.queue.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nothing waiting"
              description="Every clinic application has been reviewed."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.queue.map((clinic) => (
                <li key={clinic.id} className="flex min-w-0 items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/clinics/${clinic.id}`}
                      className="truncate text-[0.8125rem] font-medium text-navy-600 hover:text-teal-600"
                    >
                      {clinic.name}
                    </Link>
                    <p className="truncate text-[0.75rem] text-ink-muted">
                      {clinic.district ? `${clinic.district}, ${clinic.city}` : clinic.city} ·{" "}
                      {clinic._count.services} treatments · {clinic._count.staff} practitioners
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <ProviderStatusPill status={clinic.status} />
                    {clinic.submittedAt && (
                      <p className="mt-1 text-[0.6875rem] text-ink-subtle">
                        {formatRelative(clinic.submittedAt, locale)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>From the audit log</CardDescription>
            </div>
            <Link
              href="/admin/audit"
              className="shrink-0 text-[0.8125rem] font-medium text-teal-600 hover:text-teal-700"
            >
              All logs
            </Link>
          </CardHeader>

          <ul className="divide-y divide-line">
            {data.recentAudit.map((entry) => (
              <li key={entry.id} className="min-w-0 px-5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <code className="truncate text-[0.75rem] font-medium text-navy-600">
                    {entry.action}
                  </code>
                  <span className="shrink-0 text-[0.6875rem] text-ink-subtle tabular">
                    {formatDate(entry.createdAt, locale, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[0.8125rem] text-ink">{entry.summary ?? "—"}</p>
                <p className="text-[0.6875rem] text-ink-subtle">
                  {entry.actorLabel ?? "System"} · {entry.actorRole.toLowerCase()}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageTransition>
  );
}
