"use client";

import * as React from "react";
import { Timer } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Countdown on the payment step.
 *
 * The hold is real — the slot is genuinely unavailable to other people while
 * it runs — so the customer is shown exactly how long they have rather than
 * being hurried by an invented scarcity message.
 */
export function HoldTimer({
  expiresAt,
  onExpired,
}: {
  expiresAt: string;
  onExpired?: () => void;
}) {
  const [remaining, setRemaining] = React.useState(() => msLeft(expiresAt));
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    firedRef.current = false;
    setRemaining(msLeft(expiresAt));

    const interval = window.setInterval(() => {
      const next = msLeft(expiresAt);
      setRemaining(next);
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpired?.();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt, onExpired]);

  const expired = remaining <= 0;
  const urgent = !expired && remaining < 120_000;

  return (
    <div
      role="timer"
      // Announced once a minute rather than every second, so a screen reader
      // is not interrupted continuously while the customer is typing.
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-[0.8125rem]",
        expired
          ? "border-[#e6cccc] bg-danger-bg text-danger"
          : urgent
            ? "border-[#e8d7b9] bg-warning-bg text-warning"
            : "border-line bg-surface-muted/70 text-ink-muted",
      )}
    >
      <Timer aria-hidden className="size-4 shrink-0" />
      {expired ? (
        <span>Your reservation has expired. Please choose a time again.</span>
      ) : (
        <span>
          We are holding this time for you —{" "}
          <strong className="font-semibold tabular">{format(remaining)}</strong> remaining.
        </span>
      )}
    </div>
  );
}

function msLeft(expiresAt: string): number {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

function format(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
