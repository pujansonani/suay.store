"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Stethoscope } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * The main entry point into the marketplace. Both inputs carry real labels —
 * visually hidden on the hero where the layout is self-explanatory, but
 * present for anyone using a screen reader.
 */
export function SearchBar({
  defaultQuery = "",
  defaultLocation = "",
  locations = [],
  variant = "hero",
}: {
  defaultQuery?: string;
  defaultLocation?: string;
  locations?: string[];
  variant?: "hero" | "compact";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const q = String(data.get("q") ?? "").trim();
    const location = String(data.get("location") ?? "").trim();
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    setPending(true);
    router.push(`/clinics${params.toString() ? `?${params}` : ""}`);
  }

  const hero = variant === "hero";

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={
        hero
          ? "grid gap-2 rounded-lg border border-line bg-surface p-2 shadow-[var(--shadow-raised)] sm:grid-cols-[1fr_1fr_auto]"
          : "grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
      }
    >
      <div className="relative">
        <label htmlFor="search-treatment" className="sr-only">
          {t.home.searchTreatment}
        </label>
        <Stethoscope
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
        />
        <input
          id="search-treatment"
          name="q"
          defaultValue={defaultQuery}
          placeholder={t.home.searchTreatmentPlaceholder}
          className="h-11 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <div className="relative">
        <label htmlFor="search-location" className="sr-only">
          {t.home.searchLocation}
        </label>
        <MapPin
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
        />
        <input
          id="search-location"
          name="location"
          defaultValue={defaultLocation}
          list="suay-locations"
          placeholder={t.home.searchLocationPlaceholder}
          className="h-11 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
        <datalist id="suay-locations">
          {locations.map((location) => (
            <option key={location} value={location} />
          ))}
        </datalist>
      </div>

      <Button type="submit" size="lg" loading={pending} className="h-11 sm:w-32">
        {!pending && <Search aria-hidden className="size-4" />}
        {t.home.searchButton}
      </Button>
    </form>
  );
}
