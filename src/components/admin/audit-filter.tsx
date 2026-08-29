"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/field";

export function AuditFilter({
  total,
  actions,
}: {
  total: number;
  actions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label>
        <span className="sr-only">Filter by action</span>
        <Select
          className="h-9 w-auto min-w-60 text-[0.8125rem]"
          value={params.get("action") ?? "all"}
          onChange={(e) => {
            const next = new URLSearchParams(params.toString());
            if (e.target.value === "all") next.delete("action");
            else next.set("action", e.target.value);
            next.delete("page");
            router.push(`${pathname}?${next.toString()}`);
          }}
        >
          <option value="all">All actions</option>
          {actions.map((action) => (
            <option key={action.value} value={action.value}>
              {action.label}
            </option>
          ))}
        </Select>
      </label>

      <p className="ml-auto text-[0.8125rem] text-ink-muted tabular">
        {total.toLocaleString()} entries
      </p>
    </div>
  );
}
