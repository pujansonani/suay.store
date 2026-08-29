import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell, DemoAccounts } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { LineLoginButton } from "@/components/auth/line-login-button";
import { getSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/routes";
import { config } from "@/lib/config";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(HOME_FOR_ROLE[session.role]);

  const { t } = await getTranslations();

  return (
    <AuthShell
      title={t.auth.signInTitle}
      subtitle={t.auth.signInSubtitle}
      aside={
        config.demoMode ? (
          <DemoAccounts
            accounts={[
              { label: "Customer", email: "customer@demo.suay.store" },
              { label: "Clinic", email: "clinic@demo.suay.store", note: "opens the clinic portal" },
              { label: "Admin", email: "admin@demo.suay.store", note: "opens administration" },
            ]}
          />
        ) : null
      }
      footer={
        <div className="space-y-2 text-ink-muted">
          <p>
            {t.auth.noAccount}{" "}
            <Link href="/register" className="font-medium text-teal-600 hover:text-teal-700">
              {t.common.signUp}
            </Link>
          </p>
          <p>
            Are you a clinic?{" "}
            <Link href="/clinic/login" className="font-medium text-teal-600 hover:text-teal-700">
              Clinic sign in
            </Link>
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        <LineLoginButton label={t.auth.lineLogin} />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[0.75rem] text-ink-subtle">{t.auth.orEmail}</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Suspense fallback={null}>
          <LoginForm submitLabel={t.common.signIn} />
        </Suspense>
      </div>
    </AuthShell>
  );
}
