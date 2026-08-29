import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth/routes";
import { prisma } from "@/lib/db";

/**
 * Everything under this group requires PLATFORM_ADMIN. The page guard
 * redirects a customer or clinic user away; the API guards refuse
 * independently, so the navigation is never the only barrier.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage("/admin");
  const pendingCount = await prisma.provider.count({ where: { status: "PENDING_REVIEW" } });

  return (
    <AdminShell userName={session.name} pendingCount={pendingCount}>
      {children}
    </AdminShell>
  );
}
