"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account/appointments", label: "Appointments" },
  { href: "/account/profile", label: "Profile" },
];

export function AccountTabs() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav aria-label="Account sections" className="border-b border-line">
      <ul className="flex gap-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="relative">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center px-3 text-[0.8125rem] font-medium transition-colors",
                  active ? "text-teal-600" : "text-ink-muted hover:text-navy-600",
                )}
              >
                {tab.label}
              </Link>
              {active && (
                <motion.span
                  layoutId="account-tab"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal-500"
                  transition={{ duration: reduce ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
