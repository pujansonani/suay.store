import { Bell } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { Pagination } from "@/components/admin/pagination";
import { PageTransition } from "@/components/ui/motion";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminNotifications } from "@/lib/data/admin";
import { config } from "@/lib/config";
import { formatDateTime } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/notifications");
  const params = await searchParams;
  const { locale } = await getTranslations();
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page ?? 1) || 1;

  const result = await getAdminNotifications(page);

  return (
    <PageTransition>
      <PageHeader
        title="Notifications"
        description={`Every message the platform composed, and what happened to it. Transport: ${config.notifications.transport} — in this deployment nothing is actually delivered.`}
      />

      {result.notifications.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={Bell} title="No notifications" description="No messages have been generated yet." />
        </div>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Event</Th>
                <Th>Channel</Th>
                <Th>To</Th>
                <Th>Subject</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {result.notifications.map((notification) => (
                <Tr key={notification.id}>
                  <Td className="whitespace-nowrap text-[0.8125rem] text-ink-muted tabular">
                    {formatDateTime(notification.createdAt, locale)}
                  </Td>
                  <Td>
                    <code className="text-[0.75rem] text-navy-600">{notification.event}</code>
                  </Td>
                  <Td className="text-[0.75rem] text-ink-muted">{notification.channel}</Td>
                  <Td className="break-all text-[0.8125rem] text-ink-muted">
                    {notification.toAddress ?? "in-app"}
                  </Td>
                  <Td className="max-w-xs truncate text-[0.8125rem]">{notification.subject ?? "—"}</Td>
                  <Td>
                    <Badge
                      tone={
                        notification.status === "SENT"
                          ? "success"
                          : notification.status === "FAILED"
                            ? "danger"
                            : notification.status === "SKIPPED"
                              ? "neutral"
                              : "warning"
                      }
                      title={notification.errorMessage ?? undefined}
                    >
                      {notification.status.toLowerCase()}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <Pagination basePath="/admin/notifications" params={params} page={result.page} totalPages={result.totalPages} />
    </PageTransition>
  );
}
