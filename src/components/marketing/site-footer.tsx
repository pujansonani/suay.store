import Link from "next/link";

import { Logo } from "@/components/marketing/logo";

const COLUMNS = [
  {
    title: "Patients",
    links: [
      { href: "/clinics", label: "Find a clinic" },
      { href: "/treatments", label: "Browse treatments" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/account/appointments", label: "My appointments" },
    ],
  },
  {
    title: "Clinics",
    links: [
      { href: "/for-clinics", label: "List your clinic" },
      { href: "/clinic/register", label: "Register a clinic" },
      { href: "/clinic/login", label: "Clinic sign in" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/how-it-works", label: "Trust and verification" },
      { href: "/admin/login", label: "Administration" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[0.8125rem] leading-relaxed text-ink-muted">
            A booking platform for clinics, aesthetic practices and wellness providers in Thailand.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="text-[0.75rem] font-semibold tracking-wide text-navy-600">
              {column.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[0.8125rem] text-ink-muted transition-colors hover:text-teal-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-[0.75rem] text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Suay.store. Prices shown in Thai baht (THB).</p>
          <p>
            Demonstration environment. All clinics, practitioners and reviews shown are fictional
            sample data, and no payments are processed.
          </p>
        </div>
      </div>
    </footer>
  );
}
