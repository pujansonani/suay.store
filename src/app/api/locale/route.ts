import { cookies } from "next/headers";
import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { LOCALE_COOKIE } from "@/lib/i18n";

const schema = z.object({ locale: z.enum(["en", "th", "ja"]) });

/** Persists the chosen language in a cookie, and on the account when signed in. */
export const POST = handler(async (request: Request) => {
  const { locale } = await parseBody(request, schema);

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const session = await getSession();
  if (session) {
    await prisma.user.update({ where: { id: session.id }, data: { locale } });
  }

  return ok({ locale });
});
