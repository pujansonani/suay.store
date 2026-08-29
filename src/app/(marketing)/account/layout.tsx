import Link from "next/link";

import { requireCustomerPage } from "@/lib/auth/routes";
import { AccountTabs } from "@/components/account/account-tabs";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCustomerPage("/account/appointments");

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-navy-600 md:text-2xl">My account</h1>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">Signed in as {session.email}</p>
        </div>
        <Link
          href="/clinics"
          className="inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-3.5 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted"
        >
          Book a new appointment
        </Link>
      </div>

      <div className="mt-6">
        <AccountTabs />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
