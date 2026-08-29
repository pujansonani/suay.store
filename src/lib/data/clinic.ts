import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { dayBounds, todayKey, addDays } from "@/lib/time";

/**
 * Clinic portal reads.
 *
 * Every function takes `providerId` as its first argument and puts it in the
 * `where` clause. The caller obtains that id from `requireClinicMember()`,
 * which reads it from the session — so there is no path by which one clinic's
 * request can return another clinic's rows, even with a guessed id in the URL.
 */

export async function getClinicDashboard(providerId: string) {
  const today = todayKey();
  const { start: dayStart, end: dayEnd } = dayBounds(today);
  const monthStart = new Date(dayStart.getTime() - 29 * 86_400_000);

  const [todayBookings, upcoming, monthAgg, statusCounts, provider, reviewAgg] = await Promise.all([
    prisma.booking.findMany({
      where: {
        providerId,
        startAt: { gte: dayStart, lt: dayEnd },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT", "COMPLETED"] },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        reference: true,
        startAt: true,
        endAt: true,
        status: true,
        customerName: true,
        priceMinor: true,
        currency: true,
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),

    prisma.booking.findMany({
      where: { providerId, startAt: { gte: dayEnd }, status: "CONFIRMED" },
      orderBy: { startAt: "asc" },
      take: 8,
      select: {
        id: true,
        reference: true,
        startAt: true,
        status: true,
        customerName: true,
        priceMinor: true,
        currency: true,
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),

    // Revenue is counted from captured payments, not from booking prices, so
    // the figure reflects money actually taken.
    prisma.payment.aggregate({
      where: { providerId, status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] }, capturedAt: { gte: monthStart } },
      _sum: { capturedAmountMinor: true, refundedAmountMinor: true },
      _count: true,
    }),

    prisma.booking.groupBy({
      by: ["status"],
      where: { providerId, startAt: { gte: monthStart } },
      _count: true,
    }),

    prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        name: true,
        status: true,
        published: true,
        ratingAverage: true,
        ratingCount: true,
        currency: true,
      },
    }),

    prisma.review.findMany({
      where: { providerId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        isSample: true,
        customer: { select: { name: true } },
      },
    }),
  ]);

  const counts = Object.fromEntries(statusCounts.map((row) => [row.status, row._count]));
  const completed = counts.COMPLETED ?? 0;
  const cancelled = (counts.CANCELLED ?? 0) + (counts.NO_SHOW ?? 0);
  const totalInPeriod = statusCounts.reduce((sum, row) => sum + row._count, 0);

  return {
    provider,
    todayBookings,
    upcoming,
    metrics: {
      todayCount: todayBookings.length,
      upcomingCount: await prisma.booking.count({
        where: { providerId, startAt: { gte: dayEnd }, status: "CONFIRMED" },
      }),
      completedCount: completed,
      revenueMinor:
        (monthAgg._sum.capturedAmountMinor ?? 0) - (monthAgg._sum.refundedAmountMinor ?? 0),
      cancellationRate: totalInPeriod > 0 ? Math.round((cancelled / totalInPeriod) * 100) : 0,
      ratingAverage: provider?.ratingAverage ?? 0,
      ratingCount: provider?.ratingCount ?? 0,
    },
    recentReviews: reviewAgg,
  };
}

export interface ClinicBookingFilters {
  status?: string;
  from?: string;
  to?: string;
  query?: string;
  staffId?: string;
  page?: number;
  perPage?: number;
}

export async function getClinicBookings(providerId: string, filters: ClinicBookingFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(filters.perPage ?? 25, 100);

  const where: Prisma.BookingWhereInput = { providerId };

  if (filters.status && filters.status !== "all") {
    where.status = filters.status as Prisma.EnumBookingStatusFilter["equals"];
  }
  if (filters.staffId) where.staffId = filters.staffId;
  if (filters.from || filters.to) {
    where.startAt = {
      ...(filters.from ? { gte: dayBounds(filters.from).start } : {}),
      ...(filters.to ? { lt: dayBounds(filters.to).end } : {}),
    };
  }
  if (filters.query) {
    where.OR = [
      { reference: { contains: filters.query, mode: "insensitive" } },
      { customerName: { contains: filters.query, mode: "insensitive" } },
      { customerEmail: { contains: filters.query, mode: "insensitive" } },
      { service: { name: { contains: filters.query, mode: "insensitive" } } },
    ];
  }

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { startAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        reference: true,
        status: true,
        channel: true,
        startAt: true,
        endAt: true,
        durationMinutes: true,
        priceMinor: true,
        currency: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        customerNote: true,
        cancelReason: true,
        cancelledByRole: true,
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, method: true, displayLabel: true },
        },
        resourceAssignments: {
          where: { active: true },
          select: { resource: { select: { name: true, type: true } } },
        },
      },
    }),
  ]);

  return { bookings, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

/** Calendar feed for one date range, scoped to the clinic. */
export async function getClinicCalendar(providerId: string, from: string, to: string) {
  const [bookings, staff, exceptions, rules] = await Promise.all([
    prisma.booking.findMany({
      where: {
        providerId,
        startAt: { gte: dayBounds(from).start, lt: dayBounds(to).end },
        status: { in: ["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "NO_SHOW"] },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        reference: true,
        status: true,
        startAt: true,
        endAt: true,
        customerName: true,
        service: { select: { name: true } },
        staff: { select: { id: true, name: true } },
        resourceAssignments: {
          where: { active: true },
          select: { resource: { select: { name: true, type: true } } },
        },
      },
    }),
    prisma.staff.findMany({
      where: { providerId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true },
    }),
    prisma.scheduleException.findMany({
      where: { providerId, date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } },
      select: {
        id: true,
        date: true,
        type: true,
        startMinute: true,
        endMinute: true,
        reason: true,
        staff: { select: { id: true, name: true } },
      },
    }),
    prisma.scheduleRule.findMany({
      where: { providerId, ownerType: "PROVIDER" },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
      select: { dayOfWeek: true, startMinute: true, endMinute: true },
    }),
  ]);

  return { bookings, staff, exceptions, rules };
}

export async function getClinicServices(providerId: string) {
  return prisma.service.findMany({
    where: { providerId },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      importantInfo: true,
      durationMinutes: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true,
      priceMinor: true,
      currency: true,
      serviceClass: true,
      isMedicalAesthetic: true,
      requiresStaff: true,
      active: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
      resourceRequirements: {
        select: { id: true, resourceType: true, resourceTag: true, quantity: true },
      },
      staffLinks: { select: { staffId: true } },
      _count: { select: { bookings: true } },
    },
  });
}

export async function getClinicStaff(providerId: string) {
  return prisma.staff.findMany({
    where: { providerId },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
      bio: true,
      credentials: true,
      qualifications: true,
      specializations: true,
      languages: true,
      yearsExperience: true,
      verified: true,
      active: true,
      services: { select: { serviceId: true } },
      _count: { select: { bookings: true } },
    },
  });
}

export async function getClinicResources(providerId: string) {
  return prisma.resource.findMany({
    where: { providerId },
    orderBy: [{ active: "desc" }, { type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      tag: true,
      notes: true,
      active: true,
      _count: { select: { bookingAssignments: true } },
    },
  });
}

export async function getClinicSchedule(providerId: string) {
  const [rules, exceptions, staff] = await Promise.all([
    prisma.scheduleRule.findMany({
      where: { providerId },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
      select: {
        id: true,
        ownerType: true,
        staffId: true,
        dayOfWeek: true,
        startMinute: true,
        endMinute: true,
      },
    }),
    prisma.scheduleException.findMany({
      where: { providerId, date: { gte: new Date(`${addDays(todayKey(), -7)}T00:00:00Z`) } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        type: true,
        startMinute: true,
        endMinute: true,
        reason: true,
        staffId: true,
        staff: { select: { name: true } },
      },
    }),
    prisma.staff.findMany({
      where: { providerId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { rules, exceptions, staff };
}

export async function getClinicCustomers(providerId: string, query?: string) {
  return prisma.providerCustomer.findMany({
    where: {
      providerId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      userId: true,
      bookings: {
        orderBy: { startAt: "desc" },
        select: { id: true, startAt: true, status: true, service: { select: { name: true } } },
      },
    },
  });
}

export async function getClinicPayments(providerId: string) {
  const [payments, totals] = await Promise.all([
    prisma.payment.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        method: true,
        amountMinor: true,
        capturedAmountMinor: true,
        refundedAmountMinor: true,
        currency: true,
        displayLabel: true,
        createdAt: true,
        capturedAt: true,
        booking: {
          select: {
            id: true,
            reference: true,
            customerName: true,
            startAt: true,
            service: { select: { name: true } },
          },
        },
      },
    }),
    prisma.payment.aggregate({
      where: { providerId, status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } },
      _sum: { capturedAmountMinor: true, refundedAmountMinor: true },
      _count: true,
    }),
  ]);

  return {
    payments,
    grossMinor: totals._sum.capturedAmountMinor ?? 0,
    refundedMinor: totals._sum.refundedAmountMinor ?? 0,
    count: totals._count,
  };
}

export async function getClinicReviews(providerId: string) {
  return prisma.review.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      status: true,
      isSample: true,
      providerReply: true,
      providerRepliedAt: true,
      createdAt: true,
      customer: { select: { name: true } },
      booking: { select: { reference: true, startAt: true, service: { select: { name: true } } } },
    },
  });
}

export async function getClinicProfile(providerId: string) {
  return prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      slug: true,
      name: true,
      legalName: true,
      description: true,
      specialty: true,
      tagline: true,
      email: true,
      phone: true,
      website: true,
      lineId: true,
      addressLine1: true,
      addressLine2: true,
      district: true,
      city: true,
      postalCode: true,
      coverImageUrl: true,
      status: true,
      published: true,
      verificationStatus: true,
      reviewNote: true,
      suspensionReason: true,
      submittedAt: true,
      reviewedAt: true,
      onboardingStep: true,
      cancellationPolicy: true,
      bookingPolicy: true,
      cancellationWindowHours: true,
      timezone: true,
      currency: true,
      verification: true,
      _count: { select: { services: true, staff: true, resources: true, bookings: true } },
    },
  });
}

export async function getCategoryOptions() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
}
