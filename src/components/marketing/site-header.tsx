"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marketing/logo";
import { cn } from "@/lib/utils";

export interface HeaderUser {
  name: string;
  role: string;
  homeHref: string;
}

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const links = [
    { href: "/clinics", label: t.nav.findClinic },
    { href: "/treatments", label: t.nav.treatments },
    { href: "/how-it-works", label: t.nav.howItWorks },
    { href: "/for-clinics", label: t.nav.forClinics },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center gap-6">
        <Link href="/" className="shrink-0" aria-label="Suay.store home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                  active ? "text-teal-600" : "text-ink-muted hover:text-navy-600",
                )}
              >
                {link.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-teal-500"
                    transition={{ duration: reduce ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <LanguageSwitcher compact />

          {user ? (
            <Link
              href={user.homeHref}
              className="hidden h-9 items-center rounded-md border border-line-strong bg-surface px-3 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted sm:inline-flex"
            >
              {user.name.split(" ")[0]}
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden h-9 items-center rounded-md px-3 text-[0.8125rem] font-medium text-navy-600 transition-colors hover:bg-surface-muted sm:inline-flex"
            >
              {t.common.signIn}
            </Link>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0.1 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-surface md:hidden"
          >
            <nav aria-label="Mobile" className="container-page flex flex-col py-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-2 py-2.5 text-sm font-medium text-navy-600 transition-colors hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-line pt-2">
                <Link
                  href={user ? user.homeHref : "/login"}
                  className="block rounded-md px-2 py-2.5 text-sm font-medium text-teal-600"
                >
                  {user ? user.name : t.common.signIn}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
