import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell, DemoAccounts } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/routes";
import { config } from "@/lib/config";

export const metadata = { title: "Clinic sign in" };

export default async function ClinicLoginPage() {
  const session = await getSession();
  if (session) redirect(HOME_FOR_ROLE[session.role]);

  return (
    <AuthShell
      context="For clinics"
      title="Clinic sign in"
      subtitle="Manage your calendar, treatments, practitioners and bookings."
      aside={
        config.demoMode ? (
          <DemoAccounts
            accounts={[
              { label: "Clinic A", email: "clinic@demo.suay.store", note: "Aster Medical Clinic" },
              { label: "Clinic B", email: "clinic-b@demo.suay.store", note: "Nara Aesthetic Centre" },
            ]}
          />
        ) : null
      }
      footer={
        <div className="space-y-2 text-ink-muted">
          <p>
            Not registered yet?{" "}
            <Link href="/clinic/register" className="font-medium text-teal-600 hover:text-teal-700">
              Register your clinic
            </Link>
          </p>
          <p>
            Looking to book an appointment?{" "}
            <Link href="/login" className="font-medium text-teal-600 hover:text-teal-700">
              Patient sign in
            </Link>
          </p>
        </div>
      }
    >
      <Suspense fallback={null}>
        <LoginForm submitLabel="Sign in to your clinic" />
      </Suspense>
    </AuthShell>
  );
}
