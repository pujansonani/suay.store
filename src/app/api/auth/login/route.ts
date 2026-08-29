import { NextResponse } from "next/server";

import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation";
import { HOME_FOR_ROLE } from "@/lib/auth/routes";

/**
 * Sign in.
 *
 * The same message is returned whether the email is unknown or the password
 * is wrong, so the endpoint cannot be used to discover which addresses have
 * accounts. The response never echoes the role the caller asked for — it
 * reports the role the account actually has.
 */
export const POST = handler(async (request: Request) => {
  const { email, password } = await parseBody(request, loginSchema);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      status: true,
      name: true,
      providerId: true,
      provider: { select: { status: true } },
    },
  });

  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !valid) {
    throw new AppError("That email and password combination is not correct.", 401, "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      "This account is not active. Please contact Suay support.",
      403,
      "ACCOUNT_INACTIVE",
    );
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  // Clinic users whose clinic is not approved land on the status screen.
  const redirectTo =
    (user.role === "CLINIC_ADMIN" || user.role === "CLINIC_STAFF") &&
    user.provider?.status !== "APPROVED"
      ? user.providerId
        ? "/clinic/status"
        : "/clinic/register"
      : HOME_FOR_ROLE[user.role];

  return ok({ user: { id: user.id, name: user.name, role: user.role }, redirectTo });
});

export const GET = handler(async () =>
  NextResponse.json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST." } }, { status: 405 }),
);
