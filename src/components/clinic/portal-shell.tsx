"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  Clock,
  CreditCard,
  DoorOpen,
  ExternalLink,
  LayoutDashboard,
  Menu,
  Settings,
  Sparkles,
  Star,
  Users,
  UserSquare2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Logo } from "@/components/marketing/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/account/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/clinic/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clinic/bookings", label: "Appointments", icon: CalendarDays },
  { href: "/clinic/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/clinic/treatments", label: "Treatments", icon: Sparkles },
  { href: "/clinic/practitioners", label: "Practitioners", icon: UserSquare2 },
  { href: "/clinic/resources", label: "Rooms & equipment", icon: DoorOpen },
  { href: "/clinic/customers", label: "Customers", icon: Users },
  { href: "/clinic/payments", label: "Payments", icon: CreditCard },
  { href: "/clinic/reviews", label: "Reviews", icon: Star },
  { href: "/clinic/settings", label: "Working hours", icon: Clock },
  { href: "/clinic/profile", label: "Clinic profile", icon: Settings },
];

export interface PortalClinic {
  name: string;
  slug: string;
  status: string;
  published: boolean;
}

/**
 * Clinic portal frame. Desktop-first — the sidebar is always present above
 * `lg` — but the same navigation collapses behind a control on a phone, since
 * front-desk staff do check the day's list from one.
 */
export function ClinicPortalShell({
  clinic,
  userName,
  children,
}: {
  clinic: PortalClinic;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Clinic portal" className="space-y-0.5">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.8125rem] font-medium transition-colors",
              active
                ? "bg-navy-500/40 text-white"
                : "text-navy-100 hover:bg-navy-500/25 hover:text-white",
            )}
          >
            <item.icon aria-hidden className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-navy-800 bg-navy-600 lg:flex">
        <div className="border-b border-navy-500/40 px-4 py-4">
          <Link href="/" aria-label="Suay.store home">
            <Logo tone="white" />
          </Link>
          <p className="mt-3 truncate text-[0.8125rem] font-medium text-white">{clinic.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge
              tone={clinic.status === "APPROVED" ? "success" : "warning"}
              className="border-transparent"
            >
              {clinic.status === "APPROVED" ? "Approved" : clinic.status.replace("_", " ").toLowerCase()}
            </Badge>
            <Badge tone={clinic.published ? "teal" : "neutral"} className="border-transparent">
              {clinic.published ? "Published" : "Not published"}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">{nav}</div>

        <div className="border-t border-navy-500/40 px-3 py-3">
          {clinic.published && (
            <Link
              href={`/clinics/${clinic.slug}`}
              className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-[0.75rem] text-navy-100 transition-colors hover:bg-navy-500/25 hover:text-white"
            >
              <ExternalLink aria-hidden className="size-3.5" />
              View public profile
            </Link>
          )}
          <p className="px-3 text-[0.75rem] text-navy-200">{userName}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-sm">
          <div className="flex h-14 items-center gap-3 px-4 md:px-6">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="clinic-mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex size-9 items-center justify-center rounded-md text-navy-600 transition-colors hover:bg-surface-muted lg:hidden"
            >
              {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
            </button>

            <p className="truncate text-[0.8125rem] font-medium text-navy-600 lg:hidden">
              {clinic.name}
            </p>

            <div className="ml-auto flex items-center gap-2">
              <LanguageSwitcher compact />
              <SignOutButton />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id="clinic-mobile-nav"
                initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: reduce ? 0.1 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-navy-800 bg-navy-600 lg:hidden"
              >
                <div className="px-3 py-3">{nav}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main id="main" className="flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
