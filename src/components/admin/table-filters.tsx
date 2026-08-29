"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input, Select } from "@/components/ui/field";

/** Shared search + status filter used across the admin tables. */
export function AdminTableFilters({
  total,
  searchPlaceholder,
  statusOptions,
  statusKey = "status",
  statusLabel = "All statuses",
}: {
  total: number;
  searchPlaceholder: string;
  statusOptions?: { value: string; label: string }[];
  statusKey?: string;
  statusLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = React.useState(params.get("q") ?? "");

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex-1 sm:max-w-xs">
        <span className="sr-only">Search</span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", query);
          }}
          placeholder={searchPlaceholder}
          className="h-9 text-[0.8125rem]"
        />
      </label>

      {statusOptions && (
        <label>
          <span className="sr-only">Filter</span>
          <Select
            className="h-9 w-auto min-w-44 text-[0.8125rem]"
            value={params.get(statusKey) ?? "all"}
            onChange={(e) => update(statusKey, e.target.value)}
          >
            <option value="all">{statusLabel}</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      )}

      <p className="ml-auto text-[0.8125rem] text-ink-muted tabular">{total.toLocaleString()} records</p>
    </div>
  );
}
