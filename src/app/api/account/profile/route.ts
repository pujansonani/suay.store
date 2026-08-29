import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { ConflictError } from "@/lib/errors";
import { emailSchema, nameSchema, phoneSchema } from "@/lib/validation";

const schema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
});

/** Update your own profile. The id comes from the session, not the body. */
export const PATCH = handler(async (request: Request) => {
  const session = await requireUser();
  const input = await parseBody(request, schema);

  if (input.email !== session.email) {
    const taken = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (taken && taken.id !== session.id) {
      throw new ConflictError("That email address is already in use.", "EMAIL_TAKEN");
    }
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data: { name: input.name, email: input.email, phone: input.phone || null },
    select: { id: true, name: true, email: true, phone: true },
  });

  return ok({ user });
});
