import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

import { config } from "@/lib/config";
import { prisma } from "@/lib/db";

/**
 * The session cookie carries only an identity claim. Everything that governs
 * access — role, tenant, account status — is re-read from the database on each
 * request, so a suspended clinic or a revoked staff member loses access
 * immediately rather than at the end of the cookie's lifetime.
 */
export interface SessionClaims {
  sub: string;
  ver: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  locale: "en" | "th" | "ja";
  /** Present only for clinic members. The single source of tenant identity. */
  providerId: string | null;
  providerName: string | null;
  providerSlug: string | null;
  providerStatus: string | null;
  providerPublished: boolean;
}

const SESSION_VERSION = 1;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a value of at least 32 characters in .env",
    );
  }
  return new TextEncoder().encode(value);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ ver: SESSION_VERSION })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer("suay.store")
    .setExpirationTime(`${config.session.ttlSeconds}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "suay.store" });
    if (!payload.sub || payload.ver !== SESSION_VERSION) return null;
    return { sub: payload.sub, ver: SESSION_VERSION };
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  const store = await cookies();
  store.set(config.session.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: config.session.ttlSeconds,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(config.session.cookieName);
}

/**
 * Resolve the caller. Returns null for anonymous visitors and for accounts
 * that have since been suspended or deactivated.
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(config.session.cookieName)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      locale: true,
      providerId: true,
      provider: { select: { id: true, name: true, slug: true, status: true, published: true } },
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    locale: user.locale,
    providerId: user.providerId,
    providerName: user.provider?.name ?? null,
    providerSlug: user.provider?.slug ?? null,
    providerStatus: user.provider?.status ?? null,
    providerPublished: user.provider?.published ?? false,
  };
}
