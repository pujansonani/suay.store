"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input, Select } from "@/components/ui/field";

export function AdminClinicFilters({ total }: { total: number }) {
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
        <span className="sr-only">Search clinics</span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", query);
          }}
          placeholder="Search name, slug or district"
          className="h-9 text-[0.8125rem]"
        />
      </label>

      <label>
        <span className="sr-only">Filter by status</span>
        <Select
          className="h-9 w-auto min-w-44 text-[0.8125rem]"
          value={params.get("status") ?? "all"}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="CHANGES_REQUESTED">Changes requested</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
          <option value="DRAFT">Draft</option>
        </Select>
      </label>

      <p className="ml-auto text-[0.8125rem] text-ink-muted">
        {total} {total === 1 ? "clinic" : "clinics"}
      </p>
    </div>
  );
}
