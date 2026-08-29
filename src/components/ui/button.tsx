import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-teal-500 text-white border border-teal-500 hover:bg-teal-600 hover:border-teal-600 active:bg-teal-700 disabled:bg-teal-300 disabled:border-teal-300",
  secondary:
    "bg-surface text-navy-600 border border-line-strong hover:bg-surface-muted active:bg-[#e9efee] disabled:text-ink-subtle",
  ghost:
    "bg-transparent text-navy-600 border border-transparent hover:bg-surface-muted active:bg-[#e9efee]",
  danger:
    "bg-surface text-danger border border-[#e3c6c6] hover:bg-danger-bg active:bg-[#f2e0e0]",
  link: "bg-transparent text-teal-600 border-0 underline underline-offset-4 hover:text-teal-700 p-0 h-auto",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[0.9375rem] gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Press feedback is a 1px settle rather than a scale — it reads as a physical
 * button without drawing attention to itself.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, fullWidth, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-70",
        "active:translate-y-px",
        variant !== "link" && SIZES[size],
        VARIANTS[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
