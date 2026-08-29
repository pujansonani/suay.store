import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/guards";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { reviewSchema } from "@/lib/validation";

/**
 * Leave a review.
 *
 * Reviews are tied to a booking, and only a completed one: the customer must
 * have actually attended. One review per booking, enforced by a unique key as
 * well as by the check below.
 */
export const POST = handler(async (request: Request) => {
  const user = await requireCustomer();
  const input = await parseBody(request, reviewSchema);

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: { id: true, customerId: true, providerId: true, status: true, review: { select: { id: true } } },
  });

  if (!booking) throw new NotFoundError("Booking not found.");
  if (booking.customerId !== user.id) {
    throw new ForbiddenError("You do not have access to this booking.");
  }
  if (booking.status !== "COMPLETED") {
    throw new ConflictError(
      "You can leave a review once your appointment has been completed.",
      "REVIEW_NOT_ELIGIBLE",
    );
  }
  if (booking.review) {
    throw new ConflictError("You have already reviewed this appointment.", "REVIEW_EXISTS");
  }

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      providerId: booking.providerId,
      customerId: user.id,
      rating: input.rating,
      comment: input.comment || null,
      status: "PUBLISHED",
    },
    select: { id: true, rating: true },
  });

  // Keep the clinic's published rating in step with its reviews.
  const stats = await prisma.review.aggregate({
    where: { providerId: booking.providerId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.provider.update({
    where: { id: booking.providerId },
    data: {
      ratingAverage: Number((stats._avg.rating ?? 0).toFixed(2)),
      ratingCount: stats._count,
    },
  });

  return ok({ review }, 201);
});
