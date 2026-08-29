import Link from "next/link";

/** Windowed pagination: never renders 50 page links for a large table. */
export function Pagination({
  basePath,
  params,
  page,
  totalPages,
}: {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const from = Math.max(1, Math.min(page - 2, totalPages - 4));
  const to = Math.min(totalPages, from + 4);
  const pages = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  function href(target: number): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v && key !== "page") search.set(key, v);
    }
    if (target > 1) search.set("page", String(target));
    return `${basePath}${search.toString() ? `?${search}` : ""}`;
  }

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
      {page > 1 && (
        <Link
          href={href(page - 1)}
          className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-[0.8125rem] text-ink-muted transition-colors hover:bg-surface-muted"
        >
          Previous
        </Link>
      )}

      {pages.map((target) => (
        <Link
          key={target}
          href={href(target)}
          aria-current={target === page ? "page" : undefined}
          className={
            target === page
              ? "inline-flex size-9 items-center justify-center rounded-md border border-teal-500 bg-teal-500 text-[0.8125rem] font-medium text-white"
              : "inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-[0.8125rem] text-ink-muted transition-colors hover:bg-surface-muted"
          }
        >
          {target}
        </Link>
      ))}

      {page < totalPages && (
        <Link
          href={href(page + 1)}
          className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-[0.8125rem] text-ink-muted transition-colors hover:bg-surface-muted"
        >
          Next
        </Link>
      )}
    </nav>
  );
}
