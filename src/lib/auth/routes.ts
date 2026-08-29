import "server-only";

import { redirect } from "next/navigation";

import { getSession, type SessionUser } from "@/lib/auth/session";
import type { UserRole } from "@prisma/client";

/**
 * Page-level equivalents of the API guards. These redirect rather than throw,
 * because a browser navigation should land somewhere useful.
 */

export const HOME_FOR_ROLE: Record<UserRole, string> = {
  CUSTOMER: "/account/appointments",
  CLINIC_ADMIN: "/clinic/dashboard",
  CLINIC_STAFF: "/clinic/dashboard",
  PLATFORM_ADMIN: "/admin",
};

function loginPath(next: string, kind: "customer" | "clinic" | "admin"): string {
  const base =
    kind === "clinic" ? "/clinic/login" : kind === "admin" ? "/admin/login" : "/login";
  return `${base}?next=${encodeURIComponent(next)}`;
}

export async function requireCustomerPage(next: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(loginPath(next, "customer"));
  if (session.role !== "CUSTOMER") redirect("/forbidden");
  return session;
}

export async function requireClinicPage(next: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(loginPath(next, "clinic"));
  if (session.role !== "CLINIC_ADMIN" && session.role !== "CLINIC_STAFF") {
    redirect("/forbidden");
  }
  if (!session.providerId) redirect("/clinic/register");
  // Clinics that are not yet approved get the status screen instead of the
  // portal. The API guards enforce the same rule independently.
  if (session.providerStatus !== "APPROVED") redirect("/clinic/status");
  return session;
}

/** Registration and status screens: signed-in clinic user, approval optional. */
export async function requireClinicOnboardingPage(next: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(loginPath(next, "clinic"));
  if (session.role !== "CLINIC_ADMIN" && session.role !== "CLINIC_STAFF") {
    redirect("/forbidden");
  }
  return session;
}

export async function requireAdminPage(next: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(loginPath(next, "admin"));
  if (session.role !== "PLATFORM_ADMIN") redirect("/forbidden");
  return session;
}
