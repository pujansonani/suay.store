"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * LINE sign-in.
 *
 * In development this routes to a local consent screen that stands in for
 * LINE's own. The button, the callback route and the session it creates are
 * identical either way, so switching to real credentials does not change the
 * user-facing flow.
 */
export function LineLoginButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      fullWidth
      loading={pending}
      onClick={() => {
        setPending(true);
        router.push("/auth/line/mock");
      }}
      className="border-[#06C755]/30 bg-[#06C755]/5 text-navy-600 hover:bg-[#06C755]/10"
    >
      {!pending && (
        <span
          aria-hidden
          className="flex size-4 items-center justify-center rounded-xs bg-[#06C755] text-[0.5rem] font-bold text-white"
        >
          L
        </span>
      )}
      {label}
    </Button>
  );
}
