import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader, type HeaderUser } from "@/components/marketing/site-header";
import { DemoBanner } from "@/components/marketing/demo-banner";
import { getSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/routes";
import { config } from "@/lib/config";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user: HeaderUser | null = session
    ? { name: session.name, role: session.role, homeHref: HOME_FOR_ROLE[session.role] }
    : null;

  return (
    <div className="flex min-h-dvh flex-col">
      {config.demoMode && <DemoBanner />}
      <SiteHeader user={user} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
