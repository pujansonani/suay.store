import { Users } from "lucide-react";

import { PageHeader } from "@/components/clinic/page-header";
import { AdminTableFilters } from "@/components/admin/table-filters";
import { Pagination } from "@/components/admin/pagination";
import { UserActions } from "@/components/admin/user-actions";
import { PageTransition } from "@/components/ui/motion";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { requireAdminPage } from "@/lib/auth/routes";
import { getAdminUsers } from "@/lib/data/admin";
import { formatDate } from "@/lib/i18n/format";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage("/admin/users");
  const params = await searchParams;
  const { locale } = await getTranslations();

  const result = await getAdminUsers({
    role: first(params.role),
    query: first(params.q),
    page: Number(first(params.page) ?? 1) || 1,
  });

  return (
    <PageTransition>
      <PageHeader
        title="Users"
        description="Patients, clinic accounts and administrators. Suspending an account takes effect on its next request."
      />

      <div className="mb-4">
        <AdminTableFilters
          total={result.total}
          searchPlaceholder="Search name or email"
          statusKey="role"
          statusLabel="All roles"
          statusOptions={[
            { value: "CUSTOMER", label: "Patients" },
            { value: "CLINIC_ADMIN", label: "Clinic administrators" },
            { value: "CLINIC_STAFF", label: "Clinic staff" },
            { value: "PLATFORM_ADMIN", label: "Platform administrators" },
          ]}
        />
      </div>

      {result.users.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={Users} title="No users match these filters" description="Try a different role or search term." />
        </div>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Clinic</Th>
                <Th className="text-right">Bookings</Th>
                <Th>Last seen</Th>
                <Th>Status</Th>
                <Th><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {result.users.map((user) => (
                <Tr key={user.id}>
                  <Td className="text-[0.8125rem] font-medium">{user.name}</Td>
                  <Td className="break-all text-[0.8125rem] text-ink-muted">{user.email}</Td>
                  <Td>
                    <Badge tone={user.role === "PLATFORM_ADMIN" ? "navy" : "neutral"}>
                      {user.role.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </Td>
                  <Td className="text-[0.8125rem] text-ink-muted">{user.provider?.name ?? "—"}</Td>
                  <Td className="text-right text-[0.8125rem] tabular">{user._count.bookings}</Td>
                  <Td className="whitespace-nowrap text-[0.8125rem] text-ink-muted tabular">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt, locale) : "Never"}
                  </Td>
                  <Td>
                    <Badge tone={user.status === "ACTIVE" ? "success" : "danger"}>
                      {user.status.toLowerCase()}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <UserActions
                      userId={user.id}
                      email={user.email}
                      status={user.status}
                      isSelf={user.id === admin.id}
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <Pagination basePath="/admin/users" params={params} page={result.page} totalPages={result.totalPages} />
    </PageTransition>
  );
}
