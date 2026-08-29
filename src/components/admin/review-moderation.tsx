"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { Select } from "@/components/ui/field";
import { Reveal } from "@/components/ui/motion";
import type { Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/i18n/format";

export interface AdminReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  isSample: boolean;
  createdAt: string;
  customerName: string;
  providerId: string;
  providerName: string;
  reference: string;
}

export function ReviewModeration({
  reviews,
  locale,
}: {
  reviews: AdminReviewRow[];
  locale: Locale;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function moderate(id: string, status: string) {
    setPendingId(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review, index) => (
        <li key={review.id}>
          <Reveal index={index}>
            <article className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Rating value={review.rating} count={1} showCount={false} />
                    <span className="text-[0.8125rem] font-medium text-navy-600">
                      {review.customerName}
                    </span>
                    {review.isSample && <Badge tone="neutral">Sample</Badge>}
                  </div>
                  <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                    <Link
                      href={`/admin/clinics/${review.providerId}`}
                      className="hover:text-teal-600"
                    >
                      {review.providerName}
                    </Link>{" "}
                    · {review.reference} · {formatDate(review.createdAt, locale)}
                  </p>
                </div>

                <label className="shrink-0">
                  <span className="sr-only">Moderate this review</span>
                  <Select
                    className="h-8 w-auto min-w-44 text-[0.75rem]"
                    value={review.status}
                    disabled={pendingId === review.id}
                    onChange={(e) => void moderate(review.id, e.target.value)}
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="PENDING_MODERATION">Hold for moderation</option>
                    <option value="REMOVED">Removed</option>
                  </Select>
                </label>
              </div>

              {review.comment && (
                <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink">{review.comment}</p>
              )}
            </article>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
