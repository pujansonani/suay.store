import { beforeEach, describe, expect, it } from "vitest";

import { applyClinicDecision } from "@/lib/admin/clinic-decisions";
import { createBooking, cancelBooking, setBookingOutcome } from "@/lib/booking/service";
import { setPolicy } from "@/lib/config";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { PUBLIC_PROVIDER, searchClinics, getPublicClinic } from "@/lib/data/marketplace";
import { bkk, dayKey, prisma, resetDatabase, seedFixture, type Fixture } from "./helpers";
import type { SessionUser } from "@/lib/auth/session";

let f: Fixture;
const TOMORROW = dayKey(1);

const admin: SessionUser = {
  id: "admin-session",
  email: "admin@test",
  name: "Platform Admin",
  role: "PLATFORM_ADMIN",
  locale: "en",
  providerId: null,
  providerName: null,
  providerSlug: null,
  providerStatus: null,
  providerPublished: false,
};

beforeEach(async () => {
  await resetDatabase();
  f = await seedFixture();
  admin.id = f.platformAdminId;
  await setPolicy({ minNoticeMinutes: 0, slotIntervalMinutes: 30 });
});

describe("marketplace visibility", () => {
  it("only lists clinics that are approved and published", async () => {
    await prisma.provider.update({
      where: { id: f.otherProviderId },
      data: { published: false },
    });

    const { clinics } = await searchClinics({});
    const slugs = clinics.map((c) => c.slug);

    expect(slugs).toContain("clinic-a");
    expect(slugs).not.toContain("clinic-b");
  });

  it("hides pending, rejected, suspended and deactivated clinics", async () => {
    for (const status of ["PENDING_REVIEW", "REJECTED", "SUSPENDED", "DEACTIVATED"] as const) {
      await prisma.provider.update({
        where: { id: f.providerId },
        data: { status, published: true },
      });

      const { clinics } = await searchClinics({});
      expect(clinics.map((c) => c.slug)).not.toContain("clinic-a");
      expect(await getPublicClinic("clinic-a")).toBeNull();
    }
  });

  it("defines public visibility in exactly one place", () => {
    expect(PUBLIC_PROVIDER).toEqual({ status: "APPROVED", published: true });
  });
});

describe("clinic approval workflow", () => {
  beforeEach(async () => {
    await prisma.provider.update({
      where: { id: f.providerId },
      data: { status: "PENDING_REVIEW", published: false, verificationStatus: "PENDING" },
    });
  });

  it("approves a pending clinic and records who did it", async () => {
    const result = await applyClinicDecision({
      providerId: f.providerId,
      decision: "approve",
      admin,
      note: "Registration checked.",
    });

    expect(result.status).toBe("APPROVED");

    const provider = await prisma.provider.findUniqueOrThrow({ where: { id: f.providerId } });
    expect(provider.status).toBe("APPROVED");
    expect(provider.verificationStatus).toBe("APPROVED");
    expect(provider.reviewedById).toBe(f.platformAdminId);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "clinic.approved", entityId: f.providerId },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(f.platformAdminId);
    expect(audit?.actorRole).toBe("ADMIN");
  });

  it("does not publish a clinic just because it was approved", async () => {
    await applyClinicDecision({ providerId: f.providerId, decision: "approve", admin });
    const provider = await prisma.provider.findUniqueOrThrow({ where: { id: f.providerId } });
    expect(provider.published).toBe(false);
    expect(await getPublicClinic("clinic-a")).toBeNull();
  });

  it("requires a reason to reject", async () => {
    await expect(
      applyClinicDecision({ providerId: f.providerId, decision: "reject", admin }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("records the reason when rejecting, so the clinic can act on it", async () => {
    await applyClinicDecision({
      providerId: f.providerId,
      decision: "reject",
      admin,
      note: "Business registration number does not match the trading name.",
    });

    const provider = await prisma.provider.findUniqueOrThrow({ where: { id: f.providerId } });
    expect(provider.status).toBe("REJECTED");
    expect(provider.reviewNote).toMatch(/does not match/);
  });

  it("lets a rejected clinic be approved after it resubmits", async () => {
    await applyClinicDecision({
      providerId: f.providerId,
      decision: "reject",
      admin,
      note: "Missing licence reference.",
    });
    await applyClinicDecision({ providerId: f.providerId, decision: "approve", admin });

    const provider = await prisma.provider.findUniqueOrThrow({ where: { id: f.providerId } });
    expect(provider.status).toBe("APPROVED");
  });

  it("refuses an invalid transition", async () => {
    await prisma.provider.update({ where: { id: f.providerId }, data: { status: "DEACTIVATED" } });
    await expect(
      applyClinicDecision({
        providerId: f.providerId,
        decision: "suspend",
        admin,
        note: "Nope.",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("suspension preserves history", () => {
  it("removes the clinic from the marketplace but keeps its records", async () => {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Patient",
      confirmImmediately: true,
    });

    const result = await applyClinicDecision({
      providerId: f.providerId,
      decision: "suspend",
      admin,
      note: "Documentation review.",
    });

    // The upcoming appointment is reported, not silently cancelled.
    expect(result.affectedBookings).toBe(1);

    const provider = await prisma.provider.findUniqueOrThrow({ where: { id: f.providerId } });
    expect(provider.status).toBe("SUSPENDED");
    expect(provider.published).toBe(false);
    expect(provider.suspensionReason).toBe("Documentation review.");

    // Gone from the public marketplace…
    expect(await getPublicClinic("clinic-a")).toBeNull();

    // …but everything is still there for an administrator.
    const kept = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(kept).not.toBeNull();
    expect(kept?.status).toBe("CONFIRMED");
    expect(await prisma.service.count({ where: { providerId: f.providerId } })).toBeGreaterThan(0);
    expect(await prisma.staff.count({ where: { providerId: f.providerId } })).toBeGreaterThan(0);
  });

  it("stops a suspended clinic taking new bookings", async () => {
    await applyClinicDecision({
      providerId: f.providerId,
      decision: "suspend",
      admin,
      note: "Documentation review.",
    });

    await expect(
      createBooking({
        providerId: f.providerId,
        serviceId: f.serviceId,
        startAt: bkk(TOMORROW, 11 * 60),
        staffId: f.staffId,
        customerId: f.customerId,
        customerName: "Patient",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("restores marketplace access on reinstatement, once republished", async () => {
    await applyClinicDecision({
      providerId: f.providerId,
      decision: "suspend",
      admin,
      note: "Documentation review.",
    });
    await applyClinicDecision({ providerId: f.providerId, decision: "reinstate", admin });

    const provider = await prisma.provider.findUniqueOrThrow({ where: { id: f.providerId } });
    expect(provider.status).toBe("APPROVED");
    // Publication is the clinic's decision, so it stays off until they act.
    expect(provider.published).toBe(false);

    await prisma.provider.update({ where: { id: f.providerId }, data: { published: true } });
    expect(await getPublicClinic("clinic-a")).not.toBeNull();
  });

  it("deactivation keeps historical bookings for administrators", async () => {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Patient",
      confirmImmediately: true,
    });

    await applyClinicDecision({
      providerId: f.providerId,
      decision: "deactivate",
      admin,
      note: "Clinic closed permanently.",
    });

    expect(await prisma.booking.findUnique({ where: { id: booking.id } })).not.toBeNull();
    const audit = await prisma.auditLog.findFirst({
      where: { action: "clinic.deactivated", entityId: f.providerId },
    });
    expect(audit?.summary).toMatch(/deactivate/i);
  });
});

describe("reviews", () => {
  /**
   * The engine will not book a time in the past, so the booking is made for
   * tomorrow and then moved backwards — which is what the passage of time
   * would have done anyway.
   */
  async function completedBooking() {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Patient",
      confirmImmediately: true,
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        startAt: bkk(dayKey(-1), 10 * 60),
        endAt: bkk(dayKey(-1), 11 * 60),
        blockStartAt: bkk(dayKey(-1), 10 * 60),
        blockEndAt: bkk(dayKey(-1), 11 * 60),
      },
    });
    await setBookingOutcome({
      bookingId: booking.id,
      providerId: f.providerId,
      outcome: "COMPLETED",
      actorId: f.clinicAdminId,
      actorRole: "PROVIDER",
    });
    return booking;
  }

  it("marks a past appointment complete", async () => {
    const booking = await completedBooking();
    const after = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("COMPLETED");
    expect(after.completedAt).toBeInstanceOf(Date);
  });

  it("refuses to complete an appointment that has not happened yet", async () => {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Patient",
      confirmImmediately: true,
    });

    await expect(
      setBookingOutcome({
        bookingId: booking.id,
        providerId: f.providerId,
        outcome: "COMPLETED",
        actorId: f.clinicAdminId,
        actorRole: "PROVIDER",
      }),
    ).rejects.toThrow(/has not happened yet/i);
  });

  it("refuses to complete another clinic's appointment", async () => {
    const booking = await completedBooking();
    await expect(
      setBookingOutcome({
        bookingId: booking.id,
        providerId: f.otherProviderId,
        outcome: "COMPLETED",
        actorId: f.otherClinicAdminId,
        actorRole: "PROVIDER",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows a review only for a completed booking, and only once", async () => {
    const booking = await completedBooking();

    const review = await prisma.review.create({
      data: {
        bookingId: booking.id,
        providerId: f.providerId,
        customerId: f.customerId,
        rating: 5,
        comment: "Clear and unhurried.",
      },
    });
    expect(review.rating).toBe(5);

    // One review per booking, enforced by the schema.
    await expect(
      prisma.review.create({
        data: {
          bookingId: booking.id,
          providerId: f.providerId,
          customerId: f.customerId,
          rating: 3,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a rating outside 1-5 at the database level", async () => {
    const booking = await completedBooking();
    await expect(
      prisma.review.create({
        data: {
          bookingId: booking.id,
          providerId: f.providerId,
          customerId: f.customerId,
          rating: 9,
        },
      }),
    ).rejects.toThrow();
  });
});

describe("cancellation", () => {
  it("refuses to let a customer cancel someone else's appointment", async () => {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Patient",
      confirmImmediately: true,
    });

    await expect(
      cancelBooking({
        bookingId: booking.id,
        actorId: f.secondCustomerId,
        actorRole: "CUSTOMER",
        customerId: f.secondCustomerId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses to let one clinic cancel another clinic's appointment", async () => {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Patient",
      confirmImmediately: true,
    });

    await expect(
      cancelBooking({
        bookingId: booking.id,
        actorId: f.otherClinicAdminId,
        actorRole: "PROVIDER",
        providerId: f.otherProviderId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("records who cancelled and why", async () => {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Patient",
      confirmImmediately: true,
    });

    await cancelBooking({
      bookingId: booking.id,
      actorId: f.platformAdminId,
      actorRole: "ADMIN",
      reason: "Clinic closed unexpectedly.",
    });

    const after = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.cancelledByRole).toBe("ADMIN");
    expect(after.cancelledById).toBe(f.platformAdminId);
    expect(after.cancelReason).toBe("Clinic closed unexpectedly.");

    const history = await prisma.bookingStatusHistory.findFirst({
      where: { bookingId: booking.id, toStatus: "CANCELLED" },
    });
    expect(history?.actorRole).toBe("ADMIN");
  });
});

describe("provider customers", () => {
  it("belong to exactly one clinic and are not shared", async () => {
    await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Shared Patient",
      customerEmail: "shared@test",
      confirmImmediately: true,
    });

    await createBooking({
      providerId: f.otherProviderId,
      serviceId: f.otherServiceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.otherStaffId,
      customerId: f.customerId,
      customerName: "Shared Patient",
      customerEmail: "shared@test",
      confirmImmediately: true,
    });

    const forA = await prisma.providerCustomer.findMany({ where: { providerId: f.providerId } });
    const forB = await prisma.providerCustomer.findMany({ where: { providerId: f.otherProviderId } });

    // The same person, but two separate clinic-owned records.
    expect(forA).toHaveLength(1);
    expect(forB).toHaveLength(1);
    expect(forA[0]!.id).not.toBe(forB[0]!.id);
    expect(forA[0]!.userId).toBe(forB[0]!.userId);
  });
});

describe("booking attribution", () => {
  it("records where a booking came from", async () => {
    const first = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Patient",
      confirmImmediately: true,
    });

    const attribution = await prisma.bookingAttribution.findUniqueOrThrow({
      where: { bookingId: first.id },
    });
    expect(attribution.source).toBe("MARKETPLACE_DISCOVERY");
    expect(attribution.isFirstBookingWithProvider).toBe(true);

    const second = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 12 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Patient",
      confirmImmediately: true,
    });

    const repeat = await prisma.bookingAttribution.findUniqueOrThrow({
      where: { bookingId: second.id },
    });
    expect(repeat.source).toBe("RETURNING_CUSTOMER");
  });

  it("marks a front-desk booking as provider-entered", async () => {
    const walkIn = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 14 * 60),
      staffId: f.staffId,
      customerName: "Walk-in",
      channel: "WALK_IN",
      confirmImmediately: true,
    });

    const attribution = await prisma.bookingAttribution.findUniqueOrThrow({
      where: { bookingId: walkIn.id },
    });
    expect(attribution.source).toBe("PROVIDER_MANUAL");

    // And it consumes the same capacity as a marketplace booking.
    const assignment = await prisma.bookingStaffAssignment.findFirst({
      where: { bookingId: walkIn.id, active: true },
    });
    expect(assignment).not.toBeNull();
  });
});
