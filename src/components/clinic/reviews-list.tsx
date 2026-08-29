"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormError, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Rating } from "@/components/ui/rating";
import { EmptyState } from "@/components/ui/states";
import { Reveal } from "@/components/ui/motion";
import type { Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/i18n/format";

export interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  isSample: boolean;
  providerReply: string | null;
  createdAt: string;
  customerName: string;
  serviceName: string;
  reference: string;
}

export function ReviewsList({ reviews, locale }: { reviews: ReviewRow[]; locale: Locale }) {
  const router = useRouter();
  const [replying, setReplying] = React.useState<ReviewRow | null>(null);
  const [reply, setReply] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    if (!replying) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/clinic/reviews/${replying.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not post your reply.");
        setPending(false);
        return;
      }
      setReplying(null);
      setReply("");
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Patients can review your clinic once their appointment has been marked complete."
        />
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {reviews.map((review, index) => (
          <li key={review.id}>
            <Reveal index={index}>
              <article className="rounded-lg border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Rating value={review.rating} count={1} showCount={false} />
                      <span className="text-[0.8125rem] font-medium text-navy-600">
                        {review.customerName}
                      </span>
                      {review.isSample && <Badge tone="neutral">Sample review</Badge>}
                    </div>
                    <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                      {review.serviceName} · {review.reference} ·{" "}
                      {formatDate(review.createdAt, locale)}
                    </p>
                  </div>

                  {!review.providerReply && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setReplying(review);
                        setReply("");
                        setError(null);
                      }}
                    >
                      <MessageSquare aria-hidden className="size-3.5" />
                      Reply
                    </Button>
                  )}
                </div>

                {review.comment && (
                  <p className="mt-3 text-[0.875rem] leading-relaxed text-ink">{review.comment}</p>
                )}

                {review.providerReply && (
                  <div className="mt-3 border-l-2 border-teal-200 pl-3">
                    <p className="text-[0.75rem] font-medium text-navy-600">Your reply</p>
                    <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                      {review.providerReply}
                    </p>
                  </div>
                )}
              </article>
            </Reveal>
          </li>
        ))}
      </ul>

      <Modal
        open={replying !== null}
        onClose={() => setReplying(null)}
        title="Reply to this review"
        description="Your reply is published on your public profile beneath the review."
        footer={
          <>
            <Button variant="ghost" onClick={() => setReplying(null)} disabled={pending}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void save()}>
              Publish reply
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <FormError>{error}</FormError>}

          {replying?.comment && (
            <blockquote className="rounded-md border border-line bg-surface-muted/60 p-3 text-[0.8125rem] leading-relaxed text-ink-muted">
              {replying.comment}
            </blockquote>
          )}

          <Field
            label="Your reply"
            hint="Do not include any clinical detail about the patient in a public reply."
            required
          >
            {(props) => (
              <Textarea
                {...props}
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                data-autofocus
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}
