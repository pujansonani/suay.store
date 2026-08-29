import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getAvailability, resolveSlot, findNextAvailable } from "@/lib/booking/availability";
import { createBooking, cancelBooking, rescheduleBooking } from "@/lib/booking/service";
import { expireStaleHolds } from "@/lib/booking/holds";
import { setPolicy } from "@/lib/config";
import { SlotUnavailableError } from "@/lib/errors";
import { dateKeyToDateColumn } from "@/lib/time";
import { bkk, dayKey, prisma, resetDatabase, seedFixture, type Fixture } from "./helpers";

let f: Fixture;
const TOMORROW = dayKey(1);

beforeAll(async () => {
  await resetDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  f = await seedFixture();
  // Deterministic engine settings, independent of the environment.
  await setPolicy({
    slotIntervalMinutes: 30,
    minNoticeMinutes: 0,
    maxAdvanceDays: 60,
    holdMinutes: 10,
    maxReschedulesPerBooking: 2,
    allowCustomerReschedule: true,
  });
});

describe("slot generation", () => {
  it("offers slots across the clinic's opening hours", async () => {
    const [day] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.serviceId,
      from: TOMORROW,
    });

    expect(day!.isOpen).toBe(true);
    // 09:00-18:00, 60-minute treatment, 30-minute granularity -> 09:00..17:00
    expect(day!.slots[0]!.label).toBe("09:00");
    expect(day!.slots.at(-1)!.label).toBe("17:00");
    expect(day!.slots).toHaveLength(17);
  });

  it("offers no slots on a day the clinic is closed", async () => {
    await prisma.scheduleException.create({
      data: {
        providerId: f.providerId,
        date: dateKeyToDateColumn(TOMORROW),
        type: "CLOSED",
        reason: "Public holiday",
      },
    });

    const [day] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.serviceId,
      from: TOMORROW,
    });

    expect(day!.isOpen).toBe(false);
    expect(day!.closedReason).toBe("Public holiday");
    expect(day!.slots).toHaveLength(0);
  });

  it("honours modified hours for a single day", async () => {
    await prisma.scheduleException.create({
      data: {
        providerId: f.providerId,
        date: dateKeyToDateColumn(TOMORROW),
        type: "MODIFIED_HOURS",
        startMinute: 13 * 60,
        endMinute: 16 * 60,
      },
    });

    const [day] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.serviceId,
      from: TOMORROW,
    });

    expect(day!.slots.map((s) => s.label)).toEqual(["13:00", "13:30", "14:00", "14:30", "15:00"]);
  });

  it("removes a blocked period from the middle of the day", async () => {
    await prisma.scheduleException.create({
      data: {
        providerId: f.providerId,
        date: dateKeyToDateColumn(TOMORROW),
        type: "TIME_OFF",
        startMinute: 12 * 60,
        endMinute: 14 * 60,
      },
    });

    const [day] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.serviceId,
      from: TOMORROW,
    });

    const labels = day!.slots.map((s) => s.label);
    // A 60-minute treatment cannot start at 11:30 or 12:00-13:30.
    expect(labels).toContain("11:00");
    expect(labels).not.toContain("11:30");
    expect(labels).not.toContain("12:00");
    expect(labels).not.toContain("13:30");
    expect(labels).toContain("14:00");
  });

  it("supports split shifts", async () => {
    await prisma.scheduleRule.deleteMany({ where: { providerId: f.providerId } });
    const dow = new Date(`${TOMORROW}T00:00:00Z`).getUTCDay();
    await prisma.scheduleRule.createMany({
      data: [
        { providerId: f.providerId, ownerType: "PROVIDER", dayOfWeek: dow, startMinute: 600, endMinute: 840 },
        { providerId: f.providerId, ownerType: "PROVIDER", dayOfWeek: dow, startMinute: 960, endMinute: 1260 },
      ],
    });

    const [day] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.serviceId,
      from: TOMORROW,
    });

    const labels = day!.slots.map((s) => s.label);
    expect(labels).toContain("10:00");
    expect(labels).toContain("13:00"); // 13:00-14:00 fits the morning shift
    expect(labels).not.toContain("14:00"); // closed 14:00-16:00
    expect(labels).toContain("16:00");
    expect(labels).toContain("20:00"); // last start before 21:00 close
  });

  it("excludes a practitioner who is on leave, and closes the slot when none remain", async () => {
    // Take the second practitioner off this service so only one can do it.
    await prisma.staffService.deleteMany({ where: { staffId: f.secondStaffId } });
    await prisma.scheduleException.create({
      data: {
        providerId: f.providerId,
        staffId: f.staffId,
        date: dateKeyToDateColumn(TOMORROW),
        type: "TIME_OFF",
        startMinute: 9 * 60,
        endMinute: 12 * 60,
      },
    });

    const [day] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.serviceId,
      from: TOMORROW,
    });

    const labels = day!.slots.map((s) => s.label);
    expect(labels).not.toContain("09:00");
    expect(labels).not.toContain("11:00");
    expect(labels).toContain("12:00");
  });

  it("does not offer a slot when the required room is occupied, even if a practitioner is free", async () => {
    // Book the laser treatment at 10:00, consuming the only room and laser.
    await createBooking({
      providerId: f.providerId,
      serviceId: f.resourceServiceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "First",
      confirmImmediately: true,
    });

    const [day] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.resourceServiceId,
      from: TOMORROW,
    });

    const labels = day!.slots.map((s) => s.label);
    // The second practitioner is free at 10:00, but there is no second room.
    expect(labels).not.toContain("10:00");
    expect(labels).toContain("11:00");

    const free = await prisma.staff.count({ where: { providerId: f.providerId, active: true } });
    expect(free).toBe(2);
  });

  it("respects the minimum-notice window", async () => {
    await setPolicy({ minNoticeMinutes: 24 * 60 });
    const [today] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.serviceId,
      from: dayKey(0),
    });
    expect(today!.slots).toHaveLength(0);
  });

  it("finds the next available appointment", async () => {
    const next = await findNextAvailable(f.providerId, f.serviceId, { from: TOMORROW, days: 7 });
    expect(next).not.toBeNull();
    expect(next!.date).toBe(TOMORROW);
    expect(next!.slot.label).toBe("09:00");
  });
});

describe("double-booking prevention", () => {
  it("refuses a second booking for the same practitioner at the same time", async () => {
    await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "First",
      confirmImmediately: true,
    });

    await expect(
      createBooking({
        providerId: f.providerId,
        serviceId: f.serviceId,
        startAt: bkk(TOMORROW, 10 * 60),
        staffId: f.staffId,
        customerId: f.secondCustomerId,
        customerName: "Second",
        confirmImmediately: true,
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("refuses a partially overlapping booking", async () => {
    await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "First",
      confirmImmediately: true,
    });

    await expect(
      createBooking({
        providerId: f.providerId,
        serviceId: f.serviceId,
        startAt: bkk(TOMORROW, 10 * 60 + 30),
        staffId: f.staffId,
        customerId: f.secondCustomerId,
        customerName: "Second",
        confirmImmediately: true,
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("allows back-to-back bookings — intervals are half-open", async () => {
    await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "First",
      confirmImmediately: true,
    });

    const second = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 11 * 60),
      staffId: f.staffId,
      customerId: f.secondCustomerId,
      customerName: "Second",
      confirmImmediately: true,
    });

    expect(second.status).toBe("CONFIRMED");
  });

  it("lets exactly one of two concurrent requests win the same slot", async () => {
    // The real race: both pass the availability check, the database decides.
    const attempt = (name: string, customerId: string) =>
      createBooking({
        providerId: f.providerId,
        serviceId: f.serviceId,
        startAt: bkk(TOMORROW, 14 * 60),
        staffId: f.staffId,
        customerId,
        customerName: name,
        confirmImmediately: true,
      });

    const results = await Promise.allSettled([
      attempt("Racer A", f.customerId),
      attempt("Racer B", f.secondCustomerId),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(SlotUnavailableError);

    const active = await prisma.bookingStaffAssignment.count({
      where: { staffId: f.staffId, active: true },
    });
    expect(active).toBe(1);
  });

  it("lets two practitioners take the same time when capacity allows", async () => {
    const first = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 15 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "First",
      confirmImmediately: true,
    });
    const second = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 15 * 60),
      staffId: f.secondStaffId,
      customerId: f.secondCustomerId,
      customerName: "Second",
      confirmImmediately: true,
    });

    expect(first.status).toBe("CONFIRMED");
    expect(second.status).toBe("CONFIRMED");
  });

  it("refuses a second booking that needs the same room", async () => {
    await createBooking({
      providerId: f.providerId,
      serviceId: f.resourceServiceId,
      startAt: bkk(TOMORROW, 16 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "First",
      confirmImmediately: true,
    });

    // Different practitioner, same room and laser: still unavailable.
    await expect(
      createBooking({
        providerId: f.providerId,
        serviceId: f.resourceServiceId,
        startAt: bkk(TOMORROW, 16 * 60),
        staffId: f.secondStaffId,
        customerId: f.secondCustomerId,
        customerName: "Second",
        confirmImmediately: true,
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("releases the slot when a booking is cancelled", async () => {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 12 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "First",
      confirmImmediately: true,
    });

    await cancelBooking({
      bookingId: booking.id,
      actorId: f.customerId,
      actorRole: "CUSTOMER",
      customerId: f.customerId,
      reason: "Changed my mind",
    });

    const rebooked = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 12 * 60),
      staffId: f.staffId,
      customerId: f.secondCustomerId,
      customerName: "Second",
      confirmImmediately: true,
    });

    expect(rebooked.status).toBe("CONFIRMED");

    // The cancelled booking is kept, not deleted.
    const original = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(original?.status).toBe("CANCELLED");
    expect(original?.cancelReason).toBe("Changed my mind");
  });
});

describe("temporary holds", () => {
  it("holds the slot while payment is pending", async () => {
    const held = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 9 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Holder",
    });

    expect(held.status).toBe("PENDING_PAYMENT");
    expect(held.holdExpiresAt).toBeInstanceOf(Date);

    const [day] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.serviceId,
      from: TOMORROW,
      staffId: f.staffId,
    });
    expect(day!.slots.map((s) => s.label)).not.toContain("09:00");
  });

  it("releases the slot once the hold expires", async () => {
    const held = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 9 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Holder",
    });

    // Move the hold into the past, as the clock would.
    await prisma.booking.update({
      where: { id: held.id },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });

    const expired = await expireStaleHolds();
    expect(expired).toBe(1);

    const after = await prisma.booking.findUnique({ where: { id: held.id } });
    expect(after?.status).toBe("EXPIRED");

    const rebooked = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 9 * 60),
      staffId: f.staffId,
      customerId: f.secondCustomerId,
      customerName: "Second",
      confirmImmediately: true,
    });
    expect(rebooked.status).toBe("CONFIRMED");
  });

  it("expires stale holds automatically during an availability read", async () => {
    const held = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 13 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Holder",
    });
    await prisma.booking.update({
      where: { id: held.id },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });

    const [day] = await getAvailability({
      providerId: f.providerId,
      serviceId: f.serviceId,
      from: TOMORROW,
      staffId: f.staffId,
    });

    expect(day!.slots.map((s) => s.label)).toContain("13:00");
  });
});

describe("rescheduling", () => {
  it("re-checks availability rather than moving the time blindly", async () => {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Mover",
      confirmImmediately: true,
    });

    // Someone else already holds 11:00 with the same practitioner.
    await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 11 * 60),
      staffId: f.staffId,
      customerId: f.secondCustomerId,
      customerName: "Blocker",
      confirmImmediately: true,
    });

    await expect(
      rescheduleBooking({
        bookingId: booking.id,
        startAt: bkk(TOMORROW, 11 * 60),
        staffId: f.staffId,
        actorId: f.customerId,
        actorRole: "CUSTOMER",
        customerId: f.customerId,
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);

    const unchanged = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(unchanged?.startAt.toISOString()).toBe(bkk(TOMORROW, 10 * 60).toISOString());
  });

  it("moves the booking and frees the original time", async () => {
    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Mover",
      confirmImmediately: true,
    });

    await rescheduleBooking({
      bookingId: booking.id,
      startAt: bkk(TOMORROW, 15 * 60),
      staffId: f.staffId,
      actorId: f.customerId,
      actorRole: "CUSTOMER",
      customerId: f.customerId,
    });

    const moved = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(moved?.startAt.toISOString()).toBe(bkk(TOMORROW, 15 * 60).toISOString());
    expect(moved?.rescheduleCount).toBe(1);

    // The old 10:00 is bookable again.
    const taken = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.secondCustomerId,
      customerName: "Second",
      confirmImmediately: true,
    });
    expect(taken.status).toBe("CONFIRMED");
  });

  it("stops a customer rescheduling past the configured limit", async () => {
    await setPolicy({ maxReschedulesPerBooking: 1 });

    const booking = await createBooking({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 10 * 60),
      staffId: f.staffId,
      customerId: f.customerId,
      customerName: "Mover",
      confirmImmediately: true,
    });

    await rescheduleBooking({
      bookingId: booking.id,
      startAt: bkk(TOMORROW, 12 * 60),
      staffId: f.staffId,
      actorId: f.customerId,
      actorRole: "CUSTOMER",
      customerId: f.customerId,
    });

    await expect(
      rescheduleBooking({
        bookingId: booking.id,
        startAt: bkk(TOMORROW, 13 * 60),
        staffId: f.staffId,
        actorId: f.customerId,
        actorRole: "CUSTOMER",
        customerId: f.customerId,
      }),
    ).rejects.toThrow(/maximum number of times/i);
  });
});

describe("resolveSlot", () => {
  it("assigns a practitioner, a room and the equipment together", async () => {
    const slot = await resolveSlot({
      providerId: f.providerId,
      serviceId: f.resourceServiceId,
      startAt: bkk(TOMORROW, 10 * 60),
    });

    expect(slot).not.toBeNull();
    expect(slot!.staffId).toBeTruthy();
    expect(slot!.resourceIds).toHaveLength(2);
    expect(slot!.resourceIds).toContain(f.roomId);
    expect(slot!.resourceIds).toContain(f.laserId);
  });

  it("returns null for a time outside opening hours", async () => {
    const slot = await resolveSlot({
      providerId: f.providerId,
      serviceId: f.serviceId,
      startAt: bkk(TOMORROW, 3 * 60),
    });
    expect(slot).toBeNull();
  });
});
