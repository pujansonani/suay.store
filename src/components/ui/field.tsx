"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Form primitives.
 *
 * Every control gets a real <label>. Placeholders are hints, never labels —
 * a placeholder disappears the moment someone starts typing, which is exactly
 * when they need to check what the field was for.
 */

let idCounter = 0;
function useFieldId(provided?: string) {
  const [generated] = React.useState(() => `field-${(idCounter += 1)}`);
  return provided ?? generated;
}

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: FieldProps) {
  const id = useFieldId(htmlFor);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[0.8125rem] font-medium text-navy-600">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden>
            *
          </span>
        )}
        {optional && <span className="ml-1.5 font-normal text-ink-subtle">(optional)</span>}
      </label>

      {hint && (
        <p id={hintId} className="text-[0.75rem] leading-relaxed text-ink-muted">
          {hint}
        </p>
      )}

      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}

      {/* Errors are announced, and carry an icon so colour is not the only
          signal that something is wrong. */}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[0.75rem] text-danger">
          <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  "w-full rounded-md border bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle " +
  "transition-[border-color,box-shadow] duration-150 " +
  "focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL_BASE, "h-10", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(CONTROL_BASE, "min-h-24 py-2.5", className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(CONTROL_BASE, "h-10 appearance-none bg-[length:16px] pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23647277' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
      }}
      {...props}
    />
  );
});

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  const id = useFieldId(props.id);
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded-xs border-line-strong text-teal-500 accent-teal-500"
        {...props}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[0.8125rem] font-medium text-ink">
          {label}
        </label>
        {description && <p className="text-[0.75rem] text-ink-muted">{description}</p>}
      </div>
    </div>
  );
}

/** Non-field error, e.g. a failed sign-in or a lost slot. */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-[#e6cccc] bg-danger-bg px-3 py-2.5 text-[0.8125rem] text-danger"
    >
      <AlertCircle aria-hidden className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
