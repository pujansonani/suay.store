import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { dayBounds, todayKey } from "@/lib/time";

/**
 * Platform administration reads.
 *
 * Unlike the clinic layer, these are deliberately unscoped — an administrator
 * sees every clinic, booking and payment on the platform. Access is gated by
 * `requireAdmin()` at every entry point rather than by the query shape.
 */

export async function getAdminOverview() {
  const { start: dayStart, end: dayEnd } = dayBounds(todayKey());
  const monthStart = new Date(dayStart.getTime() - 29 * 86_400_000);

  const [
    providerCounts,
    pendingReview,
    userCount,
    bookingsToday,
    bookingsMonth,
    revenue,
    openModeration,
    recentAudit,
    recentClinics,
  ] = await Promise.all([
    prisma.provider.groupBy({ by: ["status"], _count: true }),
    prisma.provider.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.booking.count({ where: { startAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.booking.groupBy({
      by: ["status"],
      where: { createdAt: { gte: monthStart } },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] }, capturedAt: { gte: monthStart } },
      _sum: { capturedAmountMinor: true, refundedAmountMinor: true },
    }),
    prisma.moderationCase.count({ where: { status: "OPEN" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        summary: true,
        actorLabel: true,
        actorRole: true,
        createdAt: true,
        entityType: true,
      },
    }),
    prisma.provider.findMany({
      where: { status: { in: ["PENDING_REVIEW", "CHANGES_REQUESTED"] } },
      orderBy: { submittedAt: "asc" },
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        district: true,
        status: true,
        submittedAt: true,
        _count: { select: { services: true, staff: true } },
      },
    }),
  ]);

  const byStatus = Object.fromEntries(providerCounts.map((row) => [row.status, row._count]));
  const byRole = Object.fromEntries(userCount.map((row) => [row.role, row._count]));

  return {
    providers: {
      total: providerCounts.reduce((sum, row) => sum + row._count, 0),
      approved: byStatus.APPROVED ?? 0,
      pending: pendingReview,
      suspended: byStatus.SUSPENDED ?? 0,
      rejected: byStatus.REJECTED ?? 0,
    },
    users: {
      customers: byRole.CUSTOMER ?? 0,
      clinicUsers: (byRole.CLINIC_ADMIN ?? 0) + (byRole.CLINIC_STAFF ?? 0),
      admins: byRole.PLATFORM_ADMIN ?? 0,
    },
    bookings: {
      today: bookingsToday,
      month: bookingsMonth.reduce((sum, row) => sum + row._count, 0),
      confirmed: bookingsMonth.find((r) => r.status === "CONFIRMED")?._count ?? 0,
      cancelled: bookingsMonth.find((r) => r.status === "CANCELLED")?._count ?? 0,
    },
    revenueMinor:
      (revenue._sum.capturedAmountMinor ?? 0) - (revenue._sum.refundedAmountMinor ?? 0),
    openModeration,
    recentAudit,
    queue: recentClinics,
  };
}

export interface AdminClinicFilters {
  status?: string;
  query?: string;
  page?: number;
  perPage?: number;
}

export async function getAdminClinics(filters: AdminClinicFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(filters.perPage ?? 20, 100);

  const where: Prisma.ProviderWhereInput = {};
  if (filters.status && filters.status !== "all") {
    where.status = filters.status as Prisma.EnumProviderStatusFilter["equals"];
  }
  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: "insensitive" } },
      { slug: { contains: filters.query, mode: "insensitive" } },
      { email: { contains: filters.query, mode: "insensitive" } },
      { district: { contains: filters.query, mode: "insensitive" } },
    ];
  }

  const [total, clinics] = await Promise.all([
    prisma.provider.count({ where }),
    prisma.provider.findMany({
      where,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        slug: true,
        name: true,
        district: true,
        city: true,
        status: true,
        published: true,
        verificationStatus: true,
        ratingAverage: true,
        ratingCount: true,
        submittedAt: true,
        createdAt: true,
        _count: { select: { services: true, staff: true, bookings: true } },
      },
    }),
  ]);

  return { clinics, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getAdminClinic(id: string) {
  return prisma.provider.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      legalName: true,
      description: true,
      specialty: true,
      email: true,
      phone: true,
      website: true,
      addressLine1: true,
      district: true,
      city: true,
      postalCode: true,
      status: true,
      published: true,
      verificationStatus: true,
      submittedAt: true,
      reviewedAt: true,
      reviewNote: true,
      suspendedAt: true,
      suspensionReason: true,
      ratingAverage: true,
      ratingCount: true,
      cancellationPolicy: true,
      bookingPolicy: true,
      createdAt: true,
      verification: true,
      members: { select: { id: true, name: true, email: true, role: true, lastLoginAt: true } },
      services: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          priceMinor: true,
          currency: true,
          active: true,
          serviceClass: true,
        },
      },
      staff: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          verified: true,
          active: true,
          credentials: true,
          qualifications: true,
          yearsExperience: true,
        },
      },
      resources: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true, tag: true, active: true },
      },
      bookings: {
        orderBy: { startAt: "desc" },
        take: 20,
        select: {
          id: true,
          reference: true,
          status: true,
          startAt: true,
          priceMinor: true,
          currency: true,
          customerName: true,
          service: { select: { name: true } },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          method: true,
          amountMinor: true,
          capturedAmountMinor: true,
          refundedAmountMinor: true,
          currency: true,
          createdAt: true,
          booking: { select: { reference: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          comment: true,
          status: true,
          isSample: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      },
      _count: { select: { services: true, staff: true, bookings: true, reviews: true } },
    },
  });
}

export async function getClinicAuditTrail(providerId: string) {
  return prisma.auditLog.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      summary: true,
      actorLabel: true,
      actorRole: true,
      metadata: true,
      createdAt: true,
    },
  });
}

export async function getAdminBookings(filters: {
  status?: string;
  query?: string;
  providerId?: string;
  page?: number;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = 25;

  const where: Prisma.BookingWhereInput = {};
  if (filters.status && filters.status !== "all") {
    where.status = filters.status as Prisma.EnumBookingStatusFilter["equals"];
  }
  if (filters.providerId) where.providerId = filters.providerId;
  if (filters.query) {
    where.OR = [
      { reference: { contains: filters.query, mode: "insensitive" } },
      { customerName: { contains: filters.query, mode: "insensitive" } },
      { provider: { name: { contains: filters.query, mode: "insensitive" } } },
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
        priceMinor: true,
        currency: true,
        customerName: true,
        service: { select: { name: true } },
        provider: { select: { id: true, name: true, slug: true, status: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      },
    }),
  ]);

  return { bookings, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getAdminUsers(filters: { role?: string; query?: string; page?: number }) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = 25;

  const where: Prisma.UserWhereInput = {};
  if (filters.role && filters.role !== "all") {
    where.role = filters.role as Prisma.EnumUserRoleFilter["equals"];
  }
  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: "insensitive" } },
      { email: { contains: filters.query, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        provider: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
      },
    }),
  ]);

  return { users, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getAdminPayments(page = 1) {
  const perPage = 25;
  const [total, payments, totals] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        status: true,
        method: true,
        gateway: true,
        amountMinor: true,
        capturedAmountMinor: true,
        refundedAmountMinor: true,
        currency: true,
        createdAt: true,
        provider: { select: { id: true, name: true } },
        booking: { select: { reference: true, customerName: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } },
      _sum: { capturedAmountMinor: true, refundedAmountMinor: true },
    }),
  ]);

  return {
    payments,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    grossMinor: totals._sum.capturedAmountMinor ?? 0,
    refundedMinor: totals._sum.refundedAmountMinor ?? 0,
  };
}

export async function getAdminReviews(page = 1) {
  const perPage = 25;
  const [total, reviews] = await Promise.all([
    prisma.review.count(),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        isSample: true,
        createdAt: true,
        customer: { select: { name: true } },
        provider: { select: { id: true, name: true } },
        booking: { select: { reference: true } },
      },
    }),
  ]);
  return { reviews, total, page, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getAuditLogs(filters: { action?: string; page?: number }) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = 50;

  const where: Prisma.AuditLogWhereInput = {};
  if (filters.action && filters.action !== "all") where.action = filters.action;

  const [total, logs, actions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        summary: true,
        metadata: true,
        actorLabel: true,
        actorRole: true,
        ip: true,
        createdAt: true,
        providerId: true,
      },
    }),
    prisma.auditLog.groupBy({ by: ["action"], _count: true, orderBy: { action: "asc" } }),
  ]);

  return { logs, total, page, totalPages: Math.max(1, Math.ceil(total / perPage)), actions };
}

export async function getAdminNotifications(page = 1) {
  const perPage = 50;
  const [total, notifications] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        event: true,
        channel: true,
        status: true,
        toAddress: true,
        subject: true,
        createdAt: true,
        sentAt: true,
        errorMessage: true,
      },
    }),
  ]);
  return { notifications, total, page, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getAdminServices(page = 1, query?: string) {
  const perPage = 25;
  const where: Prisma.ServiceWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { provider: { name: { contains: query, mode: "insensitive" } } },
        ],
      }
    : {};

  const [total, services] = await Promise.all([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      orderBy: [{ provider: { name: "asc" } }, { name: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        priceMinor: true,
        currency: true,
        active: true,
        serviceClass: true,
        isMedicalAesthetic: true,
        provider: { select: { id: true, name: true, status: true } },
        _count: { select: { bookings: true } },
      },
    }),
  ]);

  return { services, total, page, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}
