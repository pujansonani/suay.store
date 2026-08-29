import Link from "next/link";
import { ScrollText } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { AuditFilter } from "@/components/admin/audit-filter";
import { Pagination } from "@/components/admin/pagination";
import { PageTransition } from "@/components/ui/motion";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAuditLogs } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Audit logs" };
export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/audit");
  const params = await searchParams;
  const { locale } = await getTranslations();

  const result = await getAuditLogs({
    action: first(params.action),
    page: Number(first(params.page) ?? 1) || 1,
  });

  return (
    <PageTransition>
      <PageHeader
        title="Audit logs"
        description="An append-only record of consequential actions: approvals, suspensions, edits made on a clinic's behalf, cancellations and payment state changes. Entries are never modified or deleted."
      />

      <div className="mb-4">
        <AuditFilter
          total={result.total}
          actions={result.actions.map((a) => ({ value: a.action, label: `${a.action} (${a._count})` }))}
        />
      </div>

      {result.logs.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={ScrollText} title="No entries" description="Nothing matches this filter." />
        </div>
      ) : (
        <ol className="space-y-2">
          {result.logs.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-line bg-surface px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-[0.75rem] font-medium text-navy-600">{entry.action}</code>
                  <Badge tone="neutral">{entry.entityType}</Badge>
                  <Badge tone={entry.actorRole === "ADMIN" ? "navy" : "neutral"}>
                    {entry.actorRole.toLowerCase()}
                  </Badge>
                </div>
                <span className="text-[0.6875rem] text-ink-subtle tabular">
                  {formatDateTime(entry.createdAt, locale)}
                </span>
              </div>

              <p className="mt-1 text-[0.8125rem] text-ink">{entry.summary ?? "—"}</p>

              <p className="mt-0.5 text-[0.6875rem] text-ink-subtle">
                {entry.actorLabel ?? "System"}
                {entry.ip && ` · ${entry.ip}`}
                {entry.providerId && (
                  <>
                    {" · "}
                    <Link
                      href={`/admin/clinics/${entry.providerId}`}
                      className="text-teal-600 hover:text-teal-700"
                    >
                      clinic
                    </Link>
                  </>
                )}
              </p>

              {entry.metadata != null && Object.keys(entry.metadata as object).length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[0.6875rem] text-ink-muted hover:text-navy-600">
                    Details
                  </summary>
                  <pre className="mt-1.5 overflow-x-auto rounded-sm bg-canvas p-2 text-[0.6875rem] leading-relaxed text-ink-muted">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}

      <Pagination basePath="/admin/audit" params={params} page={result.page} totalPages={result.totalPages} />
    </PageTransition>
  );
}
