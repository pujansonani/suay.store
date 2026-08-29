import { handler, ok } from "@/lib/api";
import { parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ConflictError } from "@/lib/errors";
import { customerRegisterSchema } from "@/lib/validation";

/** Customer sign-up. Always creates a CUSTOMER — role is never client-supplied. */
export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, customerRegisterSchema);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError(
      "An account already exists with that email address. Try signing in instead.",
      "EMAIL_TAKEN",
    );
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      phone: input.phone || null,
      role: "CUSTOMER",
    },
    select: { id: true, name: true, role: true },
  });

  await createSession(user.id);
  return ok({ user, redirectTo: "/account/appointments" }, 201);
});
