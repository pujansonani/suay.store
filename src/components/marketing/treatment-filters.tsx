"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/field";

export function TreatmentFilters({
  categories,
  total,
}: {
  categories: { value: string; label: string }[];
  total: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="mr-auto text-[0.8125rem] text-ink-muted">{total}</p>

      <label className="flex items-center gap-2">
        <span className="sr-only">Treatment area</span>
        <Select
          className="h-9 w-auto min-w-44 text-[0.8125rem]"
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

      <label className="flex items-center gap-2">
        <span className="sr-only">Maximum price</span>
        <Select
          className="h-9 w-auto min-w-36 text-[0.8125rem]"
          value={params.get("maxPrice") ?? ""}
          onChange={(e) => update("maxPrice", e.target.value)}
        >
          <option value="">Any price</option>
          <option value="100000">Up to ฿1,000</option>
          <option value="250000">Up to ฿2,500</option>
          <option value="500000">Up to ฿5,000</option>
          <option value="1000000">Up to ฿10,000</option>
        </Select>
      </label>

      <label className="flex items-center gap-2">
        <span className="shrink-0 text-[0.75rem] text-ink-muted">Sort by</span>
        <Select
          className="h-9 w-auto min-w-40 text-[0.8125rem]"
          value={params.get("sort") ?? "recommended"}
          onChange={(e) => update("sort", e.target.value === "recommended" ? "" : e.target.value)}
        >
          <option value="recommended">Recommended</option>
          <option value="rating">Highest rated clinic</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </Select>
      </label>
    </div>
  );
}
