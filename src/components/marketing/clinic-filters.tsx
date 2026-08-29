"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Filters live in the URL, so a filtered view can be bookmarked, shared or
 * reloaded. Ranking is stated plainly in the sort control rather than hidden
 * behind an opaque "best match".
 */
export function ClinicFilters({
  categories,
  totalLabel,
}: {
  categories: FilterOption[];
  totalLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const active = React.useMemo(() => {
    const keys = ["category", "rating", "maxPrice", "verified"];
    return keys.filter((key) => params.get(key)).length;
  }, [params]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    const next = new URLSearchParams();
    const q = params.get("q");
    const location = params.get("location");
    if (q) next.set("q", q);
    if (location) next.set("location", location);
    router.push(`${pathname}${next.toString() ? `?${next}` : ""}`);
  }

  const controls = (
    <div className="grid gap-4">
      <label className="block">
        <span className="mb-1.5 block text-[0.75rem] font-medium text-navy-600">Treatment area</span>
        <Select
          value={params.get("category") ?? ""}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">All treatment areas</option>
          {categories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[0.75rem] font-medium text-navy-600">Minimum rating</span>
        <Select value={params.get("rating") ?? ""} onChange={(e) => update("rating", e.target.value)}>
          <option value="">Any rating</option>
          <option value="4.5">4.5 and above</option>
          <option value="4">4.0 and above</option>
          <option value="3.5">3.5 and above</option>
        </Select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[0.75rem] font-medium text-navy-600">Maximum price</span>
        <Select value={params.get("maxPrice") ?? ""} onChange={(e) => update("maxPrice", e.target.value)}>
          <option value="">Any price</option>
          <option value="100000">Up to ฿1,000</option>
          <option value="250000">Up to ฿2,500</option>
          <option value="500000">Up to ฿5,000</option>
          <option value="1000000">Up to ฿10,000</option>
        </Select>
      </label>

      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={params.get("verified") === "1"}
          onChange={(e) => update("verified", e.target.checked ? "1" : "")}
          className="mt-0.5 size-4 shrink-0 rounded-xs border-line-strong accent-teal-500"
        />
        <span>
          <span className="block text-[0.8125rem] font-medium text-ink">Verified clinics only</span>
          <span className="block text-[0.75rem] text-ink-muted">
            Clinics whose business and licence details have been checked by Suay.
          </span>
        </span>
      </label>

      {active > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="justify-start px-0 text-ink-muted">
          <X aria-hidden className="size-3.5" />
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: filters collapse behind a single control. */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="text-[0.8125rem] text-ink-muted">{totalLabel}</p>
        <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <SlidersHorizontal aria-hidden className="size-3.5" />
          Filters{active > 0 ? ` (${active})` : ""}
        </Button>
      </div>
      <div className={cn("mt-4 rounded-lg border border-line bg-surface p-4 lg:hidden", !open && "hidden")}>
        {controls}
      </div>

      {/* Desktop: always visible. */}
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="rounded-lg border border-line bg-surface p-4">
          <h2 className="mb-4 text-[0.8125rem] font-semibold text-navy-600">Filters</h2>
          {controls}
        </div>
      </aside>
    </>
  );
}

export function SortControl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2">
      <span className="shrink-0 text-[0.75rem] text-ink-muted">Sort by</span>
      <Select
        className="h-9 w-auto min-w-44 text-[0.8125rem]"
        value={params.get("sort") ?? "recommended"}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "recommended") next.delete("sort");
          else next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        <option value="recommended">Recommended</option>
        <option value="rating">Highest rated</option>
        <option value="earliest">Earliest available</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="nearest">Location (A–Z)</option>
      </Select>
    </label>
  );
}
