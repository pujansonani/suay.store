/* eslint-disable no-console */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { CATEGORIES, CUSTOMER_NAMES, PROVIDERS, SAMPLE_REVIEWS, type SeedProvider } from "./seed-data";

const prisma = new PrismaClient();

const TZ = "Asia/Bangkok";
const DEMO_PASSWORD = "Demo1234";

/**
 * Seeding.
 *
 * Bookings are created directly rather than through the booking service, so
 * the script deliberately tracks which practitioner, room and device it has
 * already used at each instant. Anything that would overlap is skipped — the
 * exclusion constraints in the database would reject it anyway, and having the
 * seed respect the same rule keeps the demo calendar coherent.
 */

function minutes(label: string): number {
  const [h, m] = label.split(":").map(Number);
  return h * 60 + m;
}

/** Local wall-clock time in Bangkok -> UTC instant. Bangkok is UTC+7, no DST. */
function bangkok(dateKey: string, minutesFromMidnight: number): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + (minutesFromMidnight - 7 * 60) * 60_000);
}

function dateKey(offsetDays: number): string {
  const now = new Date();
  const base = new Date(now.getTime() + 7 * 3_600_000);
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}

function dowOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function reference(n: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  let value = n * 7919 + 104729;
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length) + 31 * (i + 1);
  }
  return `SUAY-${out}`;
}

/** Small deterministic PRNG so repeated seeds produce the same demo data. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function main() {
  console.log("Resetting demo data…");

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

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const random = makeRandom(20260828);

  // --- Categories ----------------------------------------------------------
  console.log("Creating treatment categories…");
  const categoryIds = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const row = await prisma.category.create({
      data: { ...category, sortOrder: index },
    });
    categoryIds.set(category.slug, row.id);
  }

  // --- Platform admins -----------------------------------------------------
  console.log("Creating platform administrators…");
  const admin = await prisma.user.create({
    data: {
      email: "admin@demo.suay.store",
      passwordHash,
      name: "Suay Platform Admin",
      role: "PLATFORM_ADMIN",
      emailVerified: true,
      phone: "+66 2 000 0000",
    },
  });

  await prisma.user.create({
    data: {
      email: "reviewer@demo.suay.store",
      passwordHash,
      name: "Verification Reviewer",
      role: "PLATFORM_ADMIN",
      emailVerified: true,
    },
  });

  // --- Providers -----------------------------------------------------------
  console.log(`Creating ${PROVIDERS.length} demo clinics…`);
  interface BuiltProvider {
    id: string;
    seed: SeedProvider;
    serviceIds: Map<string, string>;
    staffIds: Map<string, string>;
    resourcesByTag: Map<string, string[]>;
  }
  const built: BuiltProvider[] = [];

  for (const [index, seed] of PROVIDERS.entries()) {
    const isApproved = seed.status === "APPROVED";

    const provider = await prisma.provider.create({
      data: {
        slug: seed.slug,
        name: seed.name,
        legalName: seed.legalName,
        description: seed.description,
        specialty: seed.specialty,
        tagline: seed.tagline,
        email: seed.email,
        phone: seed.phone,
        website: `https://${seed.slug}.demo.suay.store`,
        addressLine1: seed.addressLine1,
        district: seed.district,
        city: seed.city,
        postalCode: seed.postalCode,
        country: "TH",
        coverImageUrl: `/covers/cover-${seed.cover}.svg`,
        timezone: TZ,
        currency: "THB",
        status: seed.status,
        published: seed.published,
        onboardingStep: 9,
        verificationStatus: isApproved ? "APPROVED" : seed.status === "PENDING_REVIEW" ? "PENDING" : "APPROVED",
        submittedAt: bangkok(dateKey(-40 - index), 600),
        reviewedAt: isApproved ? bangkok(dateKey(-38 - index), 660) : null,
        reviewedById: isApproved ? admin.id : null,
        suspendedAt: seed.status === "SUSPENDED" ? bangkok(dateKey(-5), 600) : null,
        suspensionReason:
          seed.status === "SUSPENDED"
            ? "Demo record: suspended by a platform administrator pending a documentation review."
            : null,
        cancellationPolicy: seed.cancellationPolicy,
        bookingPolicy: seed.bookingPolicy,
        cancellationWindowHours: seed.cancellationWindowHours,
      },
    });

    await prisma.providerVerification.create({
      data: {
        providerId: provider.id,
        businessRegistrationNo: `DEMO-BRN-${String(1000 + index)}`,
        taxId: `DEMO-TAX-${String(500000 + index)}`,
        medicalLicenseNo: `DEMO-LIC-${String(9000 + index)} (fictional)`,
        licenceAuthority: "Sample regulator record — demo data only",
        contactPersonName: seed.staff[0]?.name ?? "Clinic Manager",
        contactPersonRole: "Clinic Director",
        contactPersonPhone: seed.phone,
        contactPersonEmail: seed.email,
        documentRefs: [
          "business-registration.pdf (sample)",
          "clinic-licence.pdf (sample)",
          "practitioner-credentials.pdf (sample)",
        ],
        notes: "Fictional verification record created for demonstration purposes.",
        status: isApproved ? "APPROVED" : seed.status === "PENDING_REVIEW" ? "PENDING" : "APPROVED",
        submittedAt: bangkok(dateKey(-40 - index), 600),
        reviewedAt: isApproved ? bangkok(dateKey(-38 - index), 660) : null,
        reviewNote: isApproved ? "Documents checked against the submitted business details." : null,
      },
    });

    // Clinic owner account. The first clinic also gets the shared demo login.
    const ownerEmail =
      index === 0 ? "clinic@demo.suay.store" : `owner@${seed.slug}.demo.suay.store`;
    await prisma.user.create({
      data: {
        email: ownerEmail,
        passwordHash,
        name: `${seed.name} Owner`,
        role: "CLINIC_ADMIN",
        providerId: provider.id,
        emailVerified: true,
        phone: seed.phone,
      },
    });

    // A second clinic account, used to demonstrate cross-clinic isolation.
    if (index === 1) {
      await prisma.user.create({
        data: {
          email: "clinic-b@demo.suay.store",
          passwordHash,
          name: `${seed.name} Owner`,
          role: "CLINIC_ADMIN",
          providerId: provider.id,
          emailVerified: true,
        },
      });
    }

    // Resources
    const resourcesByTag = new Map<string, string[]>();
    for (const resource of seed.resources) {
      const row = await prisma.resource.create({
        data: {
          providerId: provider.id,
          name: resource.name,
          type: resource.type,
          tag: resource.tag,
          active: true,
        },
      });
      resourcesByTag.set(resource.tag, [...(resourcesByTag.get(resource.tag) ?? []), row.id]);
    }

    // Services
    const serviceIds = new Map<string, string>();
    for (const [order, service] of seed.services.entries()) {
      const row = await prisma.service.create({
        data: {
          providerId: provider.id,
          categoryId: categoryIds.get(service.category)!,
          slug: service.slug,
          name: service.name,
          description: service.description,
          importantInfo: service.importantInfo,
          serviceClass: service.serviceClass,
          isMedicalAesthetic: service.isMedicalAesthetic ?? false,
          durationMinutes: service.durationMinutes,
          bufferAfterMinutes: service.bufferAfterMinutes ?? 10,
          priceMinor: service.priceMinor,
          currency: "THB",
          requiresStaff: true,
          active: true,
          sortOrder: order,
        },
      });
      serviceIds.set(service.slug, row.id);

      for (const requirement of service.requires ?? []) {
        await prisma.serviceResourceRequirement.create({
          data: {
            serviceId: row.id,
            resourceType: requirement.type,
            resourceTag: requirement.tag,
            quantity: requirement.quantity ?? 1,
          },
        });
      }
    }

    // Practitioners
    const staffIds = new Map<string, string>();
    for (const [order, member] of seed.staff.entries()) {
      const row = await prisma.staff.create({
        data: {
          providerId: provider.id,
          name: member.name,
          role: member.role,
          bio: member.bio,
          credentials: member.credentials,
          qualifications: member.qualifications,
          specializations: member.specializations,
          languages: member.languages,
          yearsExperience: member.yearsExperience,
          verified: member.verified && isApproved,
          verifiedAt: member.verified && isApproved ? bangkok(dateKey(-38 - index), 660) : null,
          active: true,
          sortOrder: order,
        },
      });
      staffIds.set(member.name, row.id);

      await prisma.staffService.createMany({
        data: member.services
          .map((slug) => serviceIds.get(slug))
          .filter((id): id is string => Boolean(id))
          .map((serviceId) => ({ staffId: row.id, serviceId })),
      });
    }

    // Opening hours
    await prisma.scheduleRule.createMany({
      data: seed.hours.map(([dayOfWeek, start, end]) => ({
        providerId: provider.id,
        ownerType: "PROVIDER" as const,
        dayOfWeek,
        startMinute: minutes(start),
        endMinute: minutes(end),
      })),
    });

    // A lunch break and a public holiday, so the calendar is not uniform.
    await prisma.scheduleException.create({
      data: {
        providerId: provider.id,
        date: new Date(`${dateKey(9)}T00:00:00.000Z`),
        type: "CLOSED",
        reason: "Public holiday (demo)",
      },
    });

    if (seed.staff.length > 1) {
      const secondStaffId = staffIds.get(seed.staff[1]!.name)!;
      await prisma.scheduleException.create({
        data: {
          providerId: provider.id,
          staffId: secondStaffId,
          date: new Date(`${dateKey(3)}T00:00:00.000Z`),
          type: "TIME_OFF",
          startMinute: minutes("12:00"),
          endMinute: minutes("15:00"),
          reason: "Personal leave (demo)",
        },
      });
    }

    built.push({ id: provider.id, seed, serviceIds, staffIds, resourcesByTag });

    await prisma.auditLog.create({
      data: {
        action: "clinic.registered",
        entityType: "Provider",
        entityId: provider.id,
        providerId: provider.id,
        actorRole: "PROVIDER",
        actorLabel: `${seed.name} Owner`,
        summary: `${seed.name} submitted a registration`,
        createdAt: bangkok(dateKey(-40 - index), 600),
      },
    });

    if (isApproved) {
      await prisma.auditLog.create({
        data: {
          action: "clinic.approved",
          entityType: "Provider",
          entityId: provider.id,
          providerId: provider.id,
          actorId: admin.id,
          actorRole: "ADMIN",
          actorLabel: admin.name,
          summary: `${seed.name} approved`,
          metadata: { verification: "APPROVED" },
          createdAt: bangkok(dateKey(-38 - index), 660),
        },
      });
    }

    if (seed.status === "SUSPENDED") {
      await prisma.auditLog.create({
        data: {
          action: "clinic.suspended",
          entityType: "Provider",
          entityId: provider.id,
          providerId: provider.id,
          actorId: admin.id,
          actorRole: "ADMIN",
          actorLabel: admin.name,
          summary: `${seed.name} suspended`,
          metadata: { reason: "Documentation review (demo)" },
          createdAt: bangkok(dateKey(-5), 600),
        },
      });
    }
  }

  // --- Customers -----------------------------------------------------------
  console.log(`Creating ${CUSTOMER_NAMES.length} demo customers…`);
  const customers: { id: string; name: string; email: string; phone: string }[] = [];

  const primary = await prisma.user.create({
    data: {
      email: "customer@demo.suay.store",
      passwordHash,
      name: "Suda Demo",
      role: "CUSTOMER",
      phone: "+66 81 000 0001",
      emailVerified: true,
      locale: "en",
    },
  });
  customers.push({ id: primary.id, name: primary.name, email: primary.email, phone: primary.phone! });

  for (const [index, name] of CUSTOMER_NAMES.entries()) {
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@demo.suay.store`;
    const phone = `+66 81 000 ${String(1000 + index).slice(-4)}`;
    const row = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: "CUSTOMER",
        phone,
        emailVerified: true,
        locale: index % 7 === 0 ? "th" : index % 11 === 0 ? "ja" : "en",
      },
    });
    customers.push({ id: row.id, name, email, phone });
  }

  // --- Bookings ------------------------------------------------------------
  console.log("Creating demo bookings…");

  // Tracks occupancy so the seed never generates an overlap the database
  // would reject. Key: entity id -> list of [startMs, endMs).
  const busy = new Map<string, [number, number][]>();
  function isFree(id: string, start: Date, end: Date): boolean {
    return !(busy.get(id) ?? []).some(([s, e]) => start.getTime() < e && s < end.getTime());
  }
  function occupy(id: string, start: Date, end: Date): void {
    busy.set(id, [...(busy.get(id) ?? []), [start.getTime(), end.getTime()]]);
  }

  let created = 0;
  let reviewsCreated = 0;
  let bookingIndex = 0;

  // Past bookings (completed, some reviewed), then upcoming ones.
  const plan: { dayOffset: number; status: "COMPLETED" | "CONFIRMED" | "CANCELLED" | "PENDING_PAYMENT" }[] = [
    { dayOffset: -21, status: "COMPLETED" }, { dayOffset: -18, status: "COMPLETED" },
    { dayOffset: -15, status: "COMPLETED" }, { dayOffset: -12, status: "COMPLETED" },
    { dayOffset: -10, status: "COMPLETED" }, { dayOffset: -8, status: "COMPLETED" },
    { dayOffset: -7, status: "COMPLETED" }, { dayOffset: -6, status: "CANCELLED" },
    { dayOffset: -5, status: "COMPLETED" }, { dayOffset: -4, status: "COMPLETED" },
    { dayOffset: -3, status: "COMPLETED" }, { dayOffset: -2, status: "COMPLETED" },
    { dayOffset: 1, status: "CONFIRMED" }, { dayOffset: 1, status: "CONFIRMED" },
    { dayOffset: 2, status: "CONFIRMED" }, { dayOffset: 2, status: "CONFIRMED" },
    { dayOffset: 3, status: "CONFIRMED" }, { dayOffset: 4, status: "CONFIRMED" },
    { dayOffset: 5, status: "CONFIRMED" }, { dayOffset: 6, status: "CONFIRMED" },
    { dayOffset: 7, status: "CONFIRMED" }, { dayOffset: 8, status: "CONFIRMED" },
    { dayOffset: 2, status: "CANCELLED" }, { dayOffset: 4, status: "CONFIRMED" },
  ];

  const bookableProviders = built.filter((p) => p.seed.status === "APPROVED");

  for (const entry of plan) {
    for (let offset = 0; offset < 4; offset += 1) {
      // The first clinic is the one the shared demo login opens, so it always
      // gets a booking — a demo that opens onto an empty calendar shows
      // nothing. The rest are spread across the other clinics.
      const provider =
        offset === 0
          ? bookableProviders[0]!
          : bookableProviders[(bookingIndex + offset) % bookableProviders.length]!;
      const key = dateKey(entry.dayOffset);
      const dow = dowOf(key);

      const openings = provider.seed.hours.filter(([d]) => d === dow);
      if (openings.length === 0) continue;

      const serviceSeed = provider.seed.services[bookingIndex % provider.seed.services.length]!;
      const serviceId = provider.serviceIds.get(serviceSeed.slug)!;

      const eligible = provider.seed.staff.filter((s) => s.services.includes(serviceSeed.slug));
      if (eligible.length === 0) continue;
      const staffSeed = eligible[bookingIndex % eligible.length]!;
      const staffId = provider.staffIds.get(staffSeed.name)!;

      // Required rooms and devices for this treatment.
      const requirements = serviceSeed.requires ?? [];
      const opening = openings[bookingIndex % openings.length]!;
      const windowStart = minutes(opening[1]);
      const windowEnd = minutes(opening[2]);

      const bufferAfter = serviceSeed.bufferAfterMinutes ?? 10;
      let placed = false;

      const startOffset = offset === 0 ? (bookingIndex * 75) % 300 : (bookingIndex * 45) % 120;
      for (
        let minute = windowStart + startOffset;
        minute + serviceSeed.durationMinutes <= windowEnd && !placed;
        minute += 30
      ) {
        const startAt = bangkok(key, minute);
        const endAt = new Date(startAt.getTime() + serviceSeed.durationMinutes * 60_000);
        const blockStartAt = startAt;
        const blockEndAt = new Date(endAt.getTime() + bufferAfter * 60_000);

        if (!isFree(staffId, blockStartAt, blockEndAt)) continue;

        const chosenResources: string[] = [];
        let satisfied = true;
        for (const requirement of requirements) {
          const pool = provider.resourcesByTag.get(requirement.tag ?? "") ?? [];
          const free = pool.find(
            (id) => !chosenResources.includes(id) && isFree(id, blockStartAt, blockEndAt),
          );
          if (!free) {
            satisfied = false;
            break;
          }
          chosenResources.push(free);
        }
        if (!satisfied) continue;

        const customer = customers[(bookingIndex * 3 + offset) % customers.length]!;
        const isCancelled = entry.status === "CANCELLED";
        const active = !isCancelled;

        const providerCustomer = await prisma.providerCustomer.upsert({
          where: { providerId_userId: { providerId: provider.id, userId: customer.id } },
          create: {
            providerId: provider.id,
            userId: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          },
          update: {},
        });

        const booking = await prisma.booking.create({
          data: {
            reference: reference(bookingIndex + 1),
            providerId: provider.id,
            serviceId,
            customerId: customer.id,
            providerCustomerId: providerCustomer.id,
            staffId,
            status: entry.status,
            channel: bookingIndex % 9 === 0 ? "PHONE" : "MARKETPLACE",
            startAt,
            endAt,
            blockStartAt,
            blockEndAt,
            durationMinutes: serviceSeed.durationMinutes,
            timezone: TZ,
            priceMinor: serviceSeed.priceMinor,
            currency: "THB",
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            confirmedAt: entry.status === "PENDING_PAYMENT" ? null : new Date(startAt.getTime() - 86_400_000),
            completedAt: entry.status === "COMPLETED" ? endAt : null,
            cancelledAt: isCancelled ? new Date(startAt.getTime() - 172_800_000) : null,
            cancelledByRole: isCancelled ? "CUSTOMER" : null,
            cancelReason: isCancelled ? "Schedule conflict (demo data)" : null,
          },
        });

        await prisma.bookingStaffAssignment.create({
          data: { bookingId: booking.id, staffId, blockStartAt, blockEndAt, active },
        });
        for (const resourceId of chosenResources) {
          await prisma.bookingResourceAssignment.create({
            data: { bookingId: booking.id, resourceId, blockStartAt, blockEndAt, active },
          });
        }

        if (active) {
          occupy(staffId, blockStartAt, blockEndAt);
          for (const resourceId of chosenResources) occupy(resourceId, blockStartAt, blockEndAt);
        }

        await prisma.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            toStatus: entry.status,
            actorRole: isCancelled ? "CUSTOMER" : "SYSTEM",
            reason: isCancelled ? "Cancelled by customer (demo)" : "Seeded demo booking",
          },
        });

        await prisma.bookingAttribution.create({
          data: {
            bookingId: booking.id,
            source:
              booking.channel === "PHONE"
                ? "PROVIDER_MANUAL"
                : bookingIndex % 4 === 0
                  ? "RETURNING_CUSTOMER"
                  : "MARKETPLACE_DISCOVERY",
            landingPath: booking.channel === "MARKETPLACE" ? `/clinics/${provider.seed.slug}` : null,
            isFirstBookingWithProvider: bookingIndex % 4 !== 0,
          },
        });

        if (!isCancelled) {
          await prisma.payment.create({
            data: {
              bookingId: booking.id,
              providerId: provider.id,
              gateway: "mock",
              method: bookingIndex % 3 === 0 ? "PROMPTPAY" : "CARD",
              status: "CAPTURED",
              amountMinor: serviceSeed.priceMinor,
              capturedAmountMinor: serviceSeed.priceMinor,
              currency: "THB",
              externalChargeId: `mock_ch_seed_${booking.id.slice(-12)}`,
              displayLabel: bookingIndex % 3 === 0 ? "PromptPay" : "•••• 4242",
              capturedAt: new Date(startAt.getTime() - 86_400_000),
            },
          });
        }

        // Reviews only exist for appointments that actually happened.
        if (entry.status === "COMPLETED" && random() > 0.25) {
          const sample = SAMPLE_REVIEWS[reviewsCreated % SAMPLE_REVIEWS.length]!;
          await prisma.review.create({
            data: {
              bookingId: booking.id,
              providerId: provider.id,
              customerId: customer.id,
              rating: sample.rating,
              comment: sample.comment,
              status: "PUBLISHED",
              isSample: true,
              createdAt: new Date(endAt.getTime() + 86_400_000),
              providerReply:
                reviewsCreated % 4 === 0
                  ? "Thank you for taking the time to write this — we have shared it with the team."
                  : null,
              providerRepliedAt: reviewsCreated % 4 === 0 ? new Date(endAt.getTime() + 172_800_000) : null,
            },
          });
          reviewsCreated += 1;
        }

        created += 1;
        placed = true;
      }

      bookingIndex += 1;
    }
  }

  // --- Derived aggregates --------------------------------------------------
  console.log("Recalculating clinic ratings…");
  for (const provider of built) {
    const stats = await prisma.review.aggregate({
      where: { providerId: provider.id, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        ratingAverage: Number((stats._avg.rating ?? 0).toFixed(2)),
        ratingCount: stats._count,
      },
    });
  }

  // --- Platform settings ---------------------------------------------------
  await prisma.platformSetting.create({
    data: {
      key: "platform.policy",
      value: {
        commissionBps: 1200,
        depositPercent: 100,
        cancellationFreeHours: 24,
        cancellationLateFeePercent: 50,
        holdMinutes: 10,
        slotIntervalMinutes: 15,
        maxAdvanceDays: 60,
        minNoticeMinutes: 60,
        allowCustomerReschedule: true,
        rescheduleFreeHours: 24,
        maxReschedulesPerBooking: 2,
      } as Prisma.InputJsonValue,
      description: "Commission, deposit, cancellation and booking-window policy.",
      updatedById: admin.id,
    },
  });

  const counts = {
    clinics: await prisma.provider.count(),
    treatments: await prisma.service.count(),
    practitioners: await prisma.staff.count(),
    resources: await prisma.resource.count(),
    customers: await prisma.user.count({ where: { role: "CUSTOMER" } }),
    bookings: created,
    reviews: reviewsCreated,
  };

  console.log("\nDemo data ready:");
  console.table(counts);
  console.log(`
Demo accounts (all use the password: ${DEMO_PASSWORD})

  Customer          customer@demo.suay.store
  Clinic A          clinic@demo.suay.store      (${PROVIDERS[0]!.name})
  Clinic B          clinic-b@demo.suay.store    (${PROVIDERS[1]!.name})
  Platform admin    admin@demo.suay.store

All clinics, practitioners, credentials and reviews above are fictional.
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
