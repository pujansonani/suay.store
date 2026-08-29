"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Logo } from "@/components/marketing/logo";
import { SignOutButton } from "@/components/account/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/clinics", label: "Clinics", icon: Building2 },
  { href: "/admin/verification", label: "Verification", icon: BadgeCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/services", label: "Services", icon: Sparkles },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/audit", label: "Audit logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  userName,
  pendingCount,
  children,
}: {
  userName: string;
  pendingCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav aria-label="Administration" className="space-y-0.5">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
            <span className="flex-1">{item.label}</span>
            {item.href === "/admin/verification" && pendingCount > 0 && (
              <Badge tone="warning" className="border-transparent">
                {pendingCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-navy-800 bg-navy-700 lg:flex">
        <div className="border-b border-navy-500/40 px-4 py-4">
          <Link href="/" aria-label="Suay.store home">
            <Logo tone="white" />
          </Link>
          <p className="mt-2.5 text-[0.6875rem] font-medium tracking-wide text-teal-200">
            Platform administration
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">{nav}</div>

        <div className="border-t border-navy-500/40 px-3 py-3">
          <p className="px-3 text-[0.75rem] text-navy-200">{userName}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-56">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-sm">
          <div className="flex h-14 items-center gap-3 px-4 md:px-6">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="admin-mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex size-9 items-center justify-center rounded-md text-navy-600 transition-colors hover:bg-surface-muted lg:hidden"
            >
              {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
            </button>
            <p className="text-[0.8125rem] font-medium text-navy-600 lg:hidden">Administration</p>
            <div className="ml-auto">
              <SignOutButton />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id="admin-mobile-nav"
                initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: reduce ? 0.1 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-navy-800 bg-navy-700 lg:hidden"
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
