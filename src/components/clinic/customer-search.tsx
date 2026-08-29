"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function CustomerSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(defaultValue);

  return (
    <form
      role="search"
      className="flex max-w-md gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(value.trim() ? `/clinic/customers?q=${encodeURIComponent(value.trim())}` : "/clinic/customers");
      }}
    >
      <label htmlFor="customer-search" className="sr-only">
        Search customers
      </label>
      <Input
        id="customer-search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, email or phone"
        className="h-9 text-[0.8125rem]"
      />
      <Button type="submit" variant="secondary" size="sm">
        <Search aria-hidden className="size-3.5" />
        Search
      </Button>
    </form>
  );
}
