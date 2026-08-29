import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { ForbiddenError } from "@/lib/errors";

const schema = z.object({ reply: z.string().trim().min(1, "Write a reply.").max(2000) });

/** Reply to a review on your own clinic. The rating itself is never editable. */
export const POST = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { providerId } = await requireClinicMember();
  const { id } = await context.params;
  const { reply } = await parseBody(request, schema);

  const review = await prisma.review.findFirst({ where: { id, providerId }, select: { id: true } });
  if (!review) throw new ForbiddenError("You do not have access to this review.");

  await prisma.review.update({
    where: { id },
    data: { providerReply: reply, providerRepliedAt: new Date() },
  });

  return ok({ ok: true });
});
