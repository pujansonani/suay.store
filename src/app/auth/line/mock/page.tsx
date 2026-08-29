import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { getSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/routes";
import { encodeMockLineCode } from "@/lib/line";

export const metadata = { title: "Continue with LINE" };

/**
 * Local stand-in for LINE's consent screen.
 *
 * It exists so the LINE login path can be demonstrated end to end without
 * real channel credentials. The identity it returns is clearly a demo one.
 */
export default async function MockLineConsentPage() {
  const session = await getSession();
  if (session) redirect(HOME_FOR_ROLE[session.role]);

  const identities = [
    { name: "Suda Demo", email: "customer@demo.suay.store", note: "Existing demo patient account" },
    { name: "Nan LINE User", email: "nan.line@demo.suay.store", note: "Creates a new account" },
  ];

  return (
    <AuthShell
      context="Mock LINE Login"
      title="Continue with LINE"
      subtitle="This is a local stand-in for the LINE consent screen. No LINE credentials are used and no data is sent to LINE."
      footer={
        <p className="text-ink-muted">
          <Link href="/login" className="font-medium text-teal-600 hover:text-teal-700">
            Back to sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-3">
        {identities.map((identity) => (
          <form key={identity.email} action="/api/auth/line/callback" method="GET">
            <input type="hidden" name="code" value={encodeMockLineCode(identity.name, identity.email)} />
            <button
              type="submit"
              className="flex w-full items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-teal-200 hover:bg-teal-50/40"
            >
              <span>
                <span className="block text-[0.875rem] font-medium text-navy-600">{identity.name}</span>
                <span className="block text-[0.75rem] text-ink-muted">{identity.note}</span>
              </span>
              <span aria-hidden className="text-[0.75rem] font-medium text-teal-600">
                Continue
              </span>
            </button>
          </form>
        ))}

        <p className="pt-1 text-[0.75rem] leading-relaxed text-ink-subtle">
          In production this screen is replaced by LINE's own consent page, and the callback below
          exchanges a real authorization code. The application code is the same in both cases.
        </p>

        <Link
          href="/login"
          className="flex h-9 w-full items-center justify-center rounded-md text-[0.8125rem] font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-navy-600"
        >
          Cancel
        </Link>
      </div>
    </AuthShell>
  );
}
