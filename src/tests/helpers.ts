import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const prisma = new PrismaClient();

const TZ = "Asia/Bangkok";

/** Bangkok wall-clock time -> UTC instant (Bangkok is UTC+7, no DST). */
export function bkk(dateKey: string, minutes: number): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0) + (minutes - 7 * 60) * 60_000);
}

export function dayKey(offsetDays: number): string {
  const now = new Date(Date.now() + 7 * 3_600_000);
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays),
  );
  return d.toISOString().slice(0, 10);
}

export function dowOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

export async function resetDatabase(): Promise<void> {
  // Order matters: children before parents.
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.paymentEvent.deleteMany(),
    prisma.payoutLine.deleteMany(),
    prisma.payoutBatch.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.review.deleteMany(),
    prisma.bookingStatusHistory.deleteMany(),
    prisma.bookingAttribution.deleteMany(),
    prisma.bookingStaffAssignment.deleteMany(),
    prisma.bookingResourceAssignment.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.providerCustomer.deleteMany(),
    prisma.scheduleException.deleteMany(),
    prisma.scheduleRule.deleteMany(),
    prisma.staffService.deleteMany(),
    prisma.serviceResourceRequirement.deleteMany(),
    prisma.service.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.resource.deleteMany(),
    prisma.moderationCase.deleteMany(),
    prisma.providerVerification.deleteMany(),
    prisma.user.deleteMany(),
    prisma.provider.deleteMany(),
    prisma.category.deleteMany(),
    prisma.platformSetting.deleteMany(),
  ]);
}

export interface Fixture {
  providerId: string;
  otherProviderId: string;
  serviceId: string;
  /** Needs a room and a laser as well as a practitioner. */
  resourceServiceId: string;
  otherServiceId: string;
  staffId: string;
  secondStaffId: string;
  otherStaffId: string;
  roomId: string;
  laserId: string;
  customerId: string;
  secondCustomerId: string;
  clinicAdminId: string;
  otherClinicAdminId: string;
  platformAdminId: string;
}

/**
 * Two approved clinics with overlapping shapes, so that cross-tenant tests
 * have something realistic to attempt to reach.
 */
export async function seedFixture(): Promise<Fixture> {
  const passwordHash = await bcrypt.hash("Demo1234", 4);

  const category = await prisma.category.create({
    data: { slug: "test-cat", name: "Test Category" },
  });

  async function makeClinic(slug: string, name: string) {
    const provider = await prisma.provider.create({
      data: {
        slug,
        name,
        status: "APPROVED",
        published: true,
        verificationStatus: "APPROVED",
        timezone: TZ,
        city: "Bangkok",
        district: "Testville",
        description: "Fixture clinic.",
        phone: "+66 2 000 0000",
        addressLine1: "1 Test Road",
      },
    });

    const room = await prisma.resource.create({
      data: { providerId: provider.id, name: `${slug} room`, type: "ROOM", tag: "treatment" },
    });
    const laser = await prisma.resource.create({
      data: { providerId: provider.id, name: `${slug} laser`, type: "EQUIPMENT", tag: "laser" },
    });

    const service = await prisma.service.create({
      data: {
        providerId: provider.id,
        categoryId: category.id,
        slug: "consultation",
        name: "Consultation",
        durationMinutes: 60,
        bufferAfterMinutes: 0,
        priceMinor: 150000,
        requiresStaff: true,
        active: true,
      },
    });

    // A second treatment that also needs the room and the laser.
    const resourceService = await prisma.service.create({
      data: {
        providerId: provider.id,
        categoryId: category.id,
        slug: "laser-treatment",
        name: "Laser Treatment",
        durationMinutes: 60,
        bufferAfterMinutes: 0,
        priceMinor: 400000,
        requiresStaff: true,
        active: true,
        resourceRequirements: {
          create: [
            { resourceType: "ROOM", resourceTag: "treatment", quantity: 1 },
            { resourceType: "EQUIPMENT", resourceTag: "laser", quantity: 1 },
          ],
        },
      },
    });

    const staff = await prisma.staff.create({
      data: {
        providerId: provider.id,
        name: `${name} Practitioner`,
        role: "Doctor",
        active: true,
        services: { create: [{ serviceId: service.id }, { serviceId: resourceService.id }] },
      },
    });

    const secondStaff = await prisma.staff.create({
      data: {
        providerId: provider.id,
        name: `${name} Second Practitioner`,
        role: "Doctor",
        active: true,
        sortOrder: 1,
        services: { create: [{ serviceId: service.id }, { serviceId: resourceService.id }] },
      },
    });

    // Open 09:00–18:00 every day, so tests never depend on the weekday.
    await prisma.scheduleRule.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        providerId: provider.id,
        ownerType: "PROVIDER" as const,
        dayOfWeek,
        startMinute: 9 * 60,
        endMinute: 18 * 60,
      })),
    });

    const owner = await prisma.user.create({
      data: {
        email: `owner@${slug}.test`,
        passwordHash,
        name: `${name} Owner`,
        role: "CLINIC_ADMIN",
        providerId: provider.id,
      },
    });

    return { provider, service, resourceService, staff, secondStaff, room, laser, owner };
  }

  const a = await makeClinic("clinic-a", "Clinic A");
  const b = await makeClinic("clinic-b", "Clinic B");

  const customer = await prisma.user.create({
    data: { email: "customer@test", passwordHash, name: "Test Customer", role: "CUSTOMER" },
  });
  const secondCustomer = await prisma.user.create({
    data: { email: "customer2@test", passwordHash, name: "Second Customer", role: "CUSTOMER" },
  });
  const admin = await prisma.user.create({
    data: { email: "admin@test", passwordHash, name: "Platform Admin", role: "PLATFORM_ADMIN" },
  });

  return {
    providerId: a.provider.id,
    otherProviderId: b.provider.id,
    serviceId: a.service.id,
    resourceServiceId: a.resourceService.id,
    otherServiceId: b.service.id,
    staffId: a.staff.id,
    secondStaffId: a.secondStaff.id,
    otherStaffId: b.staff.id,
    roomId: a.room.id,
    laserId: a.laser.id,
    customerId: customer.id,
    secondCustomerId: secondCustomer.id,
    clinicAdminId: a.owner.id,
    otherClinicAdminId: b.owner.id,
    platformAdminId: admin.id,
  };
}
