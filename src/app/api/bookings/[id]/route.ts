import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";

/** A customer may read their own booking, and only their own. */
export const GET = handler(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireCustomer();
  const { id } = await context.params;

  const booking = await prisma.booking.findFirst({
    where: { id, customerId: user.id },
    select: {
      id: true,
      reference: true,
      status: true,
      startAt: true,
      endAt: true,
      holdExpiresAt: true,
      priceMinor: true,
      currency: true,
      durationMinutes: true,
      customerName: true,
      service: { select: { id: true, name: true } },
      staff: { select: { name: true } },
      provider: { select: { name: true, slug: true, cancellationPolicy: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, method: true, qrPayload: true, failureMessage: true },
      },
    },
  });

  if (!booking) throw new NotFoundError("Booking not found.");
  return ok({ booking });
});
