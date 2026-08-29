import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { CustomerRegisterForm } from "@/components/auth/register-form";
import { getSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/routes";
import { getTranslations } from "@/lib/i18n/server";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect(HOME_FOR_ROLE[session.role]);

  const { t } = await getTranslations();

  return (
    <AuthShell
      title={t.auth.createAccountTitle}
      subtitle="Book with verified clinics and keep your appointments in one place."
      footer={
        <p className="text-ink-muted">
          {t.auth.haveAccount}{" "}
          <Link href="/login" className="font-medium text-teal-600 hover:text-teal-700">
            {t.common.signIn}
          </Link>
        </p>
      }
    >
      <CustomerRegisterForm />
    </AuthShell>
  );
}
