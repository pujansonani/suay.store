import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarX,
  Inbox,
  Lock,
  SearchX,
  ServerCrash,
  ShieldAlert,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Empty, error and loading states.
 *
 * Each one says what happened, and offers the next useful action. A blank
 * panel with "No data" tells someone nothing about what to do next.
 */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  // A state filling a whole page is that page's main heading; one inside a
  // card is a section heading. The caller says which this is.
  as: Heading = "h3",
}: {
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-line bg-surface-muted">
        <Icon aria-hidden className="size-5 text-ink-subtle" />
      </div>
      <Heading className="text-[0.9375rem] font-semibold text-navy-600">{title}</Heading>
      {description && (
        <p className="mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function NoResultsState({ onClear }: { onClear?: React.ReactNode }) {
  return (
    <EmptyState
      icon={SearchX}
      title="No clinics match your search"
      description="Try removing a filter, searching a wider area, or looking for a different treatment."
      action={onClear}
    />
  );
}

export function NoAvailabilityState({ hint }: { hint?: string }) {
  return (
    <EmptyState
      icon={CalendarX}
      title="No available times on this date"
      description={hint ?? "Try another date, or choose a different practitioner."}
    />
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Something went wrong on our side. Please try again.",
  action,
  variant = "server",
  as,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "server" | "network" | "forbidden" | "unauthorized" | "warning";
  as?: "h1" | "h2" | "h3";
}) {
  const icons = {
    server: ServerCrash,
    network: WifiOff,
    forbidden: ShieldAlert,
    unauthorized: Lock,
    warning: AlertTriangle,
  };
  return (
    <EmptyState icon={icons[variant]} title={title} description={description} action={action} as={as} />
  );
}

/** Full-page state used by the `forbidden` and `not-found` routes. */
export function FullPageState({
  title,
  description,
  variant = "warning",
  primaryHref = "/",
  primaryLabel = "Back to Suay",
}: {
  title: string;
  description: string;
  variant?: "server" | "network" | "forbidden" | "unauthorized" | "warning";
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <ErrorState
        as="h1"
        variant={variant}
        title={title}
        description={description}
        action={
          <Link
            href={primaryHref}
            className="inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-navy-600 transition-colors hover:bg-surface-muted"
          >
            {primaryLabel}
          </Link>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-sm", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line rounded-lg border border-line bg-surface">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SlotGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Loading available times">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-md" />
      ))}
    </div>
  );
}

/** Announces background work to assistive technology without a visual jump. */
export function LoadingAnnouncer({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}
