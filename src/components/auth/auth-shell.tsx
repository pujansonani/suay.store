import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/marketing/logo";
import { PageTransition } from "@/components/ui/motion";

/**
 * Shared frame for every sign-in and sign-up screen. `context` distinguishes
 * the three audiences without pretending they are three different products.
 */
export function AuthShell({
  title,
  subtitle,
  context,
  children,
  footer,
  aside,
}: {
  title: string;
  subtitle?: string;
  context?: string;
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex h-16 items-center">
          <Link href="/" aria-label="Suay.store home">
            <Logo />
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-5 py-12 md:py-16">
        <PageTransition className="w-full max-w-sm">
          {context && (
            <p className="mb-2 text-[0.75rem] font-medium tracking-wide text-teal-600">{context}</p>
          )}
          <h1 className="text-xl font-semibold text-navy-600">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {aside}

          {footer && <div className="mt-6 border-t border-line pt-5 text-[0.8125rem]">{footer}</div>}
        </PageTransition>
      </main>
    </div>
  );
}

/**
 * Development sign-in shortcuts. Rendered only when demo mode is on, and
 * clearly labelled so nobody mistakes them for a production feature.
 */
export function DemoAccounts({
  accounts,
}: {
  accounts: { label: string; email: string; note?: string }[];
}) {
  return (
    <div className="mt-6 rounded-md border border-line bg-surface-muted/60 p-3.5">
      <p className="text-[0.75rem] font-semibold text-navy-600">Demo accounts</p>
      <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
        Development only. Every demo account uses the password{" "}
        <code className="rounded-xs bg-surface px-1 py-px font-medium text-navy-600">Demo1234</code>.
      </p>
      <ul className="mt-2.5 space-y-1.5">
        {accounts.map((account) => (
          <li key={account.email} className="flex flex-wrap items-baseline gap-x-2 text-[0.75rem]">
            <span className="font-medium text-ink">{account.label}</span>
            <code className="text-ink-muted">{account.email}</code>
            {account.note && <span className="text-ink-subtle">— {account.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
