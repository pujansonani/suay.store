import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { ClinicRegisterForm } from "@/components/clinic/register-form";
import { getSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/routes";

export const metadata = { title: "Register your clinic" };

const STEPS = [
  "Clinic account",
  "Business information",
  "Clinic details",
  "Treatments",
  "Practitioners",
  "Rooms & equipment",
  "Working hours",
  "Verification",
  "Review & submit",
];

export default async function ClinicRegisterPage() {
  const session = await getSession();

  // Someone already part-way through registration continues where they left off.
  if (session?.role === "CLINIC_ADMIN" || session?.role === "CLINIC_STAFF") {
    redirect(session.providerStatus === "APPROVED" ? "/clinic/dashboard" : "/clinic/status");
  }
  if (session) redirect(HOME_FOR_ROLE[session.role]);

  return (
    <AuthShell
      context="For clinics · Step 1 of 9"
      title="Register your clinic"
      subtitle="Create your clinic account. You will add your treatments, practitioners and opening hours next, then submit for verification."
      aside={
        <ol className="mt-7 space-y-1.5 rounded-md border border-line bg-surface p-4">
          <p className="mb-2 text-[0.75rem] font-semibold text-navy-600">What we will ask for</p>
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-2 text-[0.75rem] text-ink-muted"
            >
              <span
                className={
                  index === 0
                    ? "flex size-4 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[0.625rem] font-semibold text-white"
                    : "flex size-4 shrink-0 items-center justify-center rounded-full border border-line-strong text-[0.625rem] text-ink-subtle"
                }
              >
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      }
      footer={
        <p className="text-ink-muted">
          Already registered?{" "}
          <Link href="/clinic/login" className="font-medium text-teal-600 hover:text-teal-700">
            Clinic sign in
          </Link>
        </p>
      }
    >
      <ClinicRegisterForm />
    </AuthShell>
  );
}
