import * as React from "react";
import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "teal" | "success" | "warning" | "danger" | "navy";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-muted border-line",
  teal: "bg-info-bg text-teal-600 border-teal-200",
  success: "bg-success-bg text-success border-[#c9e0d6]",
  warning: "bg-warning-bg text-warning border-[#e8d7b9]",
  danger: "bg-danger-bg text-danger border-[#e6cccc]",
  navy: "bg-navy-50 text-navy-600 border-navy-100",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Shown only where the underlying record is actually approved and verified.
 * The component takes the status rather than a boolean so a caller cannot
 * accidentally render a trust signal that the data does not support.
 */
export function VerifiedBadge({
  status,
  label = "Verified",
  className,
}: {
  status: string | null | undefined;
  label?: string;
  className?: string;
}) {
  if (status !== "APPROVED") return null;
  return (
    <Badge tone="teal" className={cn("gap-1", className)}>
      <BadgeCheck aria-hidden className="size-3" />
      {label}
    </Badge>
  );
}
