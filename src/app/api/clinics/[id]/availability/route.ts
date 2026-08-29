import { handler, ok, parseQuery } from "@/lib/api";
import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getAvailability } from "@/lib/booking/availability";
import { PUBLIC_PROVIDER } from "@/lib/data/marketplace";
import { availabilityQuerySchema } from "@/lib/validation";
import { addDays, diffInDays } from "@/lib/time";

/**
 * Public availability.
 *
 * Restricted to clinics that are approved and published — a pending or
 * suspended clinic's calendar is not readable by guessing its id. The range
 * is capped so this cannot be used to enumerate a year of the calendar in one
 * request.
 */
export const GET = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const query = parseQuery(request, availabilityQuerySchema);

  const provider = await prisma.provider.findFirst({
    where: { id, ...PUBLIC_PROVIDER },
    select: { id: true },
  });
  if (!provider) throw new NotFoundError("Clinic not found.");

  const to = query.to ?? query.from;
  const span = diffInDays(query.from, to);
  if (span < 0) throw new ValidationError("The end date must be on or after the start date.");
  if (span > 30) throw new ValidationError("Availability can be requested 31 days at a time.");

  const days = await getAvailability({
    providerId: provider.id,
    serviceId: query.serviceId,
    from: query.from,
    to: addDays(query.from, span),
    staffId: query.staffId ?? null,
  });

  return ok({ days });
});
