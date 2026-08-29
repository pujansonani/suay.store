import { NextResponse } from "next/server";

import { handler } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import { getLineLogin } from "@/lib/line";

/**
 * LINE login callback.
 *
 * Exchanges the authorization code for a profile and either links it to an
 * existing account or creates a new customer. The resulting session is an
 * ordinary Suay session — LINE is an identity source, not a separate
 * permission system, and it can only ever produce a CUSTOMER account.
 */
export const GET = handler(async (request: Request) => {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) throw new ValidationError("Missing authorization code.");

  const profile = await getLineLogin().exchange(code);

  let user = await prisma.user.findUnique({
    where: { lineUserId: profile.lineUserId },
    select: { id: true, status: true },
  });

  if (!user && profile.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true, status: true, role: true, lineUserId: true },
    });

    // Only link LINE to a customer account — never to a clinic or admin login.
    if (byEmail && byEmail.role === "CUSTOMER") {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { lineUserId: byEmail.lineUserId ?? profile.lineUserId },
        select: { id: true, status: true },
      });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email ?? `${profile.lineUserId.toLowerCase()}@line.demo.suay.store`,
        name: profile.displayName,
        role: "CUSTOMER",
        lineUserId: profile.lineUserId,
        emailVerified: false,
      },
      select: { id: true, status: true },
    });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/login?error=account_inactive", request.url));
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  return NextResponse.redirect(new URL("/account/appointments", request.url));
});
