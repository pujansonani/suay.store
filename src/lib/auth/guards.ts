import "server-only";

import type { UserRole } from "@prisma/client";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { getSession, type SessionUser } from "@/lib/auth/session";

/**
 * Authorization guards.
 *
 * These are the only sanctioned way to learn who is calling. Nothing in the
 * application reads a user id, a role or a provider id from a request body,
 * a query string or a header — those are attacker-controlled. Hiding a button
 * in the UI is a courtesy; these functions are the actual boundary.
 */

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError("Your account does not have access to this area.");
  }
  return user;
}

export async function requireCustomer(): Promise<SessionUser> {
  return requireRole("CUSTOMER");
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("PLATFORM_ADMIN");
}

export interface ClinicContext {
  user: SessionUser;
  /** Authenticated tenant id. Every provider-scoped query filters on this. */
  providerId: string;
  providerStatus: string;
}

/**
 * Establish the clinic tenant for this request.
 *
 * The provider id comes from the session record, never from the URL or body.
 * A clinic user with no provider, or whose clinic has been suspended or
 * deactivated, is refused here rather than in each individual handler.
 */
export async function requireClinicMember(options?: {
  /** Allow clinics that are still in registration or under review. */
  allowUnapproved?: boolean;
}): Promise<ClinicContext> {
  const user = await requireRole("CLINIC_ADMIN", "CLINIC_STAFF");

  if (!user.providerId || !user.providerStatus) {
    throw new ForbiddenError("This account is not linked to a clinic.");
  }

  if (user.providerStatus === "SUSPENDED") {
    throw new ForbiddenError(
      "This clinic is currently suspended. Please contact Suay support.",
    );
  }

  if (user.providerStatus === "DEACTIVATED") {
    throw new ForbiddenError("This clinic account has been deactivated.");
  }

  if (!options?.allowUnapproved && user.providerStatus !== "APPROVED") {
    throw new ForbiddenError(
      "Your clinic is not approved yet. You will get access once the review is complete.",
      );
  }

  return { user, providerId: user.providerId, providerStatus: user.providerStatus };
}

/** Clinic owners only — staff cannot change billing, profile or membership. */
export async function requireClinicAdmin(options?: {
  allowUnapproved?: boolean;
}): Promise<ClinicContext> {
  const context = await requireClinicMember(options);
  if (context.user.role !== "CLINIC_ADMIN") {
    throw new ForbiddenError("Only a clinic administrator can perform this action.");
  }
  return context;
}

/**
 * Assert that a record belongs to the calling tenant.
 *
 * Used after a lookup by id when the query could not be scoped up front.
 * Prefer scoping the query itself; use this as the backstop.
 */
export function assertOwnedByProvider(
  record: { providerId: string } | null | undefined,
  providerId: string,
): asserts record is { providerId: string } {
  if (!record || record.providerId !== providerId) {
    // Deliberately identical to the message used for records that do not
    // exist, so that this never confirms another clinic's data exists.
    throw new ForbiddenError("You do not have access to this resource.");
  }
}
