import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
// A pure helper with no session dependency, so it is imported statically —
// TypeScript requires an assertion function to have a declared type.
import { assertOwnedByProvider } from "@/lib/auth/guards";
import { prisma, resetDatabase, seedFixture, type Fixture } from "./helpers";

/**
 * Authorization.
 *
 * The guards read identity from the session, so these tests drive them by
 * controlling what the session resolves to — exactly the seam a real request
 * goes through. The point is that a caller cannot influence it from outside.
 */

const sessionMock = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>("@/lib/auth/session");
  return { ...actual, getSession: async () => sessionMock.current };
});

const {
  requireAdmin,
  requireClinicMember,
  requireClinicAdmin,
  requireCustomer,
  requireUser,
} = await import("@/lib/auth/guards");

let f: Fixture;

function asSession(over: Record<string, unknown>) {
  sessionMock.current = {
    id: "u1",
    email: "u@test",
    name: "User",
    role: "CUSTOMER",
    locale: "en",
    providerId: null,
    providerName: null,
    providerSlug: null,
    providerStatus: null,
    providerPublished: false,
    ...over,
  };
}

beforeEach(async () => {
  await resetDatabase();
  f = await seedFixture();
  sessionMock.current = null;
});

describe("anonymous callers", () => {
  it("cannot pass any guard", async () => {
    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(requireCustomer()).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(requireClinicMember()).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("a customer", () => {
  beforeEach(() => asSession({ role: "CUSTOMER" }));

  it("is refused the clinic portal", async () => {
    await expect(requireClinicMember()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("is refused platform administration", async () => {
    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("passes the customer guard", async () => {
    await expect(requireCustomer()).resolves.toMatchObject({ role: "CUSTOMER" });
  });
});

describe("a clinic user", () => {
  beforeEach(() =>
    asSession({
      role: "CLINIC_ADMIN",
      providerId: "provider-a",
      providerStatus: "APPROVED",
    }),
  );

  it("is refused platform administration", async () => {
    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("is refused the customer area", async () => {
    await expect(requireCustomer()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("receives its tenant id from the session, not from the request", async () => {
    const context = await requireClinicMember();
    expect(context.providerId).toBe("provider-a");
  });
});

describe("clinic account state", () => {
  it("refuses a clinic user with no clinic", async () => {
    asSession({ role: "CLINIC_ADMIN", providerId: null, providerStatus: null });
    await expect(requireClinicMember()).rejects.toThrow(/not linked to a clinic/i);
  });

  it("refuses a suspended clinic even for setup endpoints", async () => {
    asSession({ role: "CLINIC_ADMIN", providerId: "p", providerStatus: "SUSPENDED" });
    await expect(requireClinicMember()).rejects.toThrow(/suspended/i);
    await expect(requireClinicMember({ allowUnapproved: true })).rejects.toThrow(/suspended/i);
  });

  it("refuses a deactivated clinic", async () => {
    asSession({ role: "CLINIC_ADMIN", providerId: "p", providerStatus: "DEACTIVATED" });
    await expect(requireClinicMember({ allowUnapproved: true })).rejects.toThrow(/deactivated/i);
  });

  it("refuses an unapproved clinic from the portal but allows it to finish registering", async () => {
    asSession({ role: "CLINIC_ADMIN", providerId: "p", providerStatus: "PENDING_REVIEW" });
    await expect(requireClinicMember()).rejects.toThrow(/not approved yet/i);
    await expect(requireClinicMember({ allowUnapproved: true })).resolves.toMatchObject({
      providerId: "p",
    });
  });

  it("refuses clinic staff where owner rights are required", async () => {
    asSession({ role: "CLINIC_STAFF", providerId: "p", providerStatus: "APPROVED" });
    await expect(requireClinicMember()).resolves.toBeTruthy();
    await expect(requireClinicAdmin()).rejects.toThrow(/administrator/i);
  });
});

describe("an administrator", () => {
  beforeEach(() => asSession({ role: "PLATFORM_ADMIN" }));

  it("passes the admin guard", async () => {
    await expect(requireAdmin()).resolves.toMatchObject({ role: "PLATFORM_ADMIN" });
  });

  it("is still refused the clinic portal, which needs a tenant", async () => {
    await expect(requireClinicMember()).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("ownership assertions", () => {
  it("rejects a record belonging to another clinic", () => {
    expect(() => assertOwnedByProvider({ providerId: "other" }, "mine")).toThrow(ForbiddenError);
  });

  it("rejects a missing record with the same message, so it cannot be used to probe", () => {
    let missingMessage = "";
    let foreignMessage = "";
    try {
      assertOwnedByProvider(null, "mine");
    } catch (error) {
      missingMessage = (error as Error).message;
    }
    try {
      assertOwnedByProvider({ providerId: "other" }, "mine");
    } catch (error) {
      foreignMessage = (error as Error).message;
    }
    expect(missingMessage).toBe(foreignMessage);
  });

  it("accepts a record belonging to the caller", () => {
    expect(() => assertOwnedByProvider({ providerId: "mine" }, "mine")).not.toThrow();
  });
});

describe("tenant scoping at the query level", () => {
  it("a provider-scoped query cannot return another clinic's rows", async () => {
    const own = await prisma.service.findMany({ where: { providerId: f.providerId } });
    const foreign = await prisma.service.findFirst({
      where: { id: f.otherServiceId, providerId: f.providerId },
    });

    expect(own.length).toBeGreaterThan(0);
    // Clinic B's service exists, but not within Clinic A's scope.
    expect(foreign).toBeNull();
    expect(await prisma.service.findUnique({ where: { id: f.otherServiceId } })).not.toBeNull();
  });

  it("a clinic's staff lookup is empty for another clinic's practitioner", async () => {
    const foreign = await prisma.staff.findFirst({
      where: { id: f.otherStaffId, providerId: f.providerId },
    });
    expect(foreign).toBeNull();
  });
});
