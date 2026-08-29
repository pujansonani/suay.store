"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useI18n } from "@/components/i18n-provider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Language is stored in a cookie and read on the server, so a reload — or a
 * link shared with a colleague — keeps the chosen language.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const reduce = useReducedMotion();

  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<Locale | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function choose(next: Locale) {
    setPending(next);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    setOpen(false);
    setPending(null);
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.common.language}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border border-transparent px-2.5 text-[0.8125rem] font-medium text-navy-600",
          "transition-colors hover:bg-surface-muted",
          open && "bg-surface-muted",
        )}
      >
        <Globe aria-hidden className="size-4" />
        {!compact && <span>{LOCALE_LABELS[locale]}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-40 mt-1.5 w-44 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-[var(--shadow-raised)]"
          >
            {LOCALES.map((option) => (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={option === locale}
                disabled={pending !== null}
                onClick={() => choose(option)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.8125rem] text-ink transition-colors hover:bg-surface-muted disabled:opacity-60"
              >
                <span>{LOCALE_LABELS[option]}</span>
                {option === locale && <Check aria-hidden className="size-3.5 text-teal-500" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
