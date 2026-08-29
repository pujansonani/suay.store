import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { AuthShell, DemoAccounts } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/routes";
import { config } from "@/lib/config";

export const metadata = { title: "Platform administration" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect(HOME_FOR_ROLE[session.role]);

  return (
    <AuthShell
      context="Platform administration"
      title="Sign in to administration"
      subtitle="Clinic verification, moderation and platform oversight."
      aside={
        <>
          <div className="mt-6 flex items-start gap-2.5 rounded-md border border-line bg-surface p-3.5">
            <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-teal-500" />
            <p className="text-[0.75rem] leading-relaxed text-ink-muted">
              Access is granted by role, not by the page you sign in on. Accounts without platform
              administration rights are redirected to their own area.
            </p>
          </div>
          {config.demoMode && (
            <DemoAccounts accounts={[{ label: "Platform admin", email: "admin@demo.suay.store" }]} />
          )}
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm submitLabel="Sign in" />
      </Suspense>
    </AuthShell>
  );
}
