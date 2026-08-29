import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { findNextAvailable } from "@/lib/booking/availability";
import { todayKey } from "@/lib/time";

/**
 * Public marketplace reads.
 *
 * `PUBLIC_PROVIDER` is the single definition of "visible to the public": the
 * clinic has been approved by a platform admin *and* has chosen to publish.
 * Pending, rejected, suspended and deactivated clinics never appear in any
 * public query because every one of them starts from this filter.
 */
export const PUBLIC_PROVIDER = {
  status: "APPROVED",
  published: true,
} satisfies Prisma.ProviderWhereInput;

export type SortOption =
  | "recommended"
  | "rating"
  | "price_asc"
  | "price_desc"
  | "earliest"
  | "nearest";

export interface ClinicSearchParams {
  query?: string;
  location?: string;
  categorySlug?: string;
  minRating?: number;
  maxPriceMinor?: number;
  verifiedOnly?: boolean;
  sort?: SortOption;
  page?: number;
  perPage?: number;
}

export interface ClinicCardData {
  id: string;
  slug: string;
  name: string;
  specialty: string | null;
  district: string | null;
  city: string;
  coverImageUrl: string | null;
  status: string;
  ratingAverage: number;
  ratingCount: number;
  fromPriceMinor: number | null;
  currency: string;
  treatmentCount: number;
}

export interface ClinicSearchResult {
  clinics: ClinicCardData[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Search is deliberately transparent: text matches clinic name, speciality,
 * description or the name of a treatment the clinic offers; location matches
 * district or city; every filter narrows, none of them re-rank invisibly.
 */
export async function searchClinics(params: ClinicSearchParams): Promise<ClinicSearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(params.perPage ?? 12, 48);

  const where: Prisma.ProviderWhereInput = { ...PUBLIC_PROVIDER };
  const and: Prisma.ProviderWhereInput[] = [];

  if (params.query) {
    const q = params.query.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { specialty: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { services: { some: { active: true, name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  if (params.location) {
    const loc = params.location.trim();
    and.push({
      OR: [
        { district: { contains: loc, mode: "insensitive" } },
        { city: { contains: loc, mode: "insensitive" } },
        { addressLine1: { contains: loc, mode: "insensitive" } },
      ],
    });
  }

  if (params.categorySlug) {
    and.push({ services: { some: { active: true, category: { slug: params.categorySlug } } } });
  }

  if (typeof params.minRating === "number" && params.minRating > 0) {
    and.push({ ratingAverage: { gte: params.minRating } });
  }

  if (typeof params.maxPriceMinor === "number") {
    and.push({ services: { some: { active: true, priceMinor: { lte: params.maxPriceMinor } } } });
  }

  // Every clinic reaching this point is already approved; the filter exists so
  // the control reads honestly rather than as decoration.
  if (params.verifiedOnly) and.push({ verificationStatus: "APPROVED" });

  if (and.length > 0) where.AND = and;

  const orderBy = orderFor(params.sort ?? "recommended");

  const [total, rows] = await Promise.all([
    prisma.provider.count({ where }),
    prisma.provider.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        slug: true,
        name: true,
        specialty: true,
        district: true,
        city: true,
        coverImageUrl: true,
        status: true,
        ratingAverage: true,
        ratingCount: true,
        currency: true,
        services: {
          where: { active: true },
          select: { priceMinor: true },
          orderBy: { priceMinor: "asc" },
        },
      },
    }),
  ]);

  const clinics: ClinicCardData[] = rows.map((row) => {
    // "From" should quote the cheapest treatment someone actually pays for.
    // A free consultation would otherwise make every such clinic read "From ฿0".
    const paid = row.services.filter((s) => s.priceMinor > 0);
    const cheapest = (paid[0] ?? row.services[0])?.priceMinor ?? null;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      specialty: row.specialty,
      district: row.district,
      city: row.city,
      coverImageUrl: row.coverImageUrl,
      status: row.status,
      ratingAverage: row.ratingAverage,
      ratingCount: row.ratingCount,
      fromPriceMinor: cheapest,
      currency: row.currency,
      treatmentCount: row.services.length,
    };
  });

  if (params.sort === "price_asc") {
    clinics.sort((a, b) => (a.fromPriceMinor ?? Infinity) - (b.fromPriceMinor ?? Infinity));
  } else if (params.sort === "price_desc") {
    clinics.sort((a, b) => (b.fromPriceMinor ?? -1) - (a.fromPriceMinor ?? -1));
  }

  return {
    clinics,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

function orderFor(sort: SortOption): Prisma.ProviderOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return [{ ratingAverage: "desc" }, { ratingCount: "desc" }];
    case "nearest":
      // Without a geolocated visitor, "nearest" cannot be answered honestly,
      // so it falls back to alphabetical rather than inventing a distance.
      return [{ district: "asc" }, { name: "asc" }];
    case "earliest":
      return [{ ratingAverage: "desc" }];
    case "recommended":
    default:
      // Rating first, then review volume: stated plainly in the UI.
      return [{ ratingAverage: "desc" }, { ratingCount: "desc" }, { name: "asc" }];
  }
}

/** Cheapest bookable treatment plus the next free slot, for clinic cards. */
export async function nextAvailabilityForClinic(
  providerId: string,
): Promise<{ startAt: string; serviceId: string } | null> {
  const service = await prisma.service.findFirst({
    where: { providerId, active: true },
    orderBy: { priceMinor: "asc" },
    select: { id: true },
  });
  if (!service) return null;

  const found = await findNextAvailable(providerId, service.id, { from: todayKey(), days: 14 });
  return found ? { startAt: found.slot.startAt, serviceId: service.id } : null;
}

export async function getPublicClinic(slug: string) {
  return prisma.provider.findFirst({
    where: { slug, ...PUBLIC_PROVIDER },
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
      galleryUrls: true,
      status: true,
      verificationStatus: true,
      timezone: true,
      currency: true,
      ratingAverage: true,
      ratingCount: true,
      cancellationPolicy: true,
      bookingPolicy: true,
      cancellationWindowHours: true,
      createdAt: true,
      services: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { priceMinor: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          durationMinutes: true,
          priceMinor: true,
          currency: true,
          serviceClass: true,
          isMedicalAesthetic: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      staff: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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
        },
      },
      scheduleRules: {
        where: { ownerType: "PROVIDER" },
        orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
        select: { dayOfWeek: true, startMinute: true, endMinute: true },
      },
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          isSample: true,
          providerReply: true,
          customer: { select: { name: true } },
          booking: { select: { service: { select: { name: true } } } },
        },
      },
      verification: { select: { status: true, reviewedAt: true } },
    },
  });
}

/** A treatment page is only reachable when its clinic is publicly visible. */
export async function getPublicService(serviceId: string) {
  return prisma.service.findFirst({
    where: { id: serviceId, active: true, provider: PUBLIC_PROVIDER },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      importantInfo: true,
      durationMinutes: true,
      priceMinor: true,
      currency: true,
      serviceClass: true,
      isMedicalAesthetic: true,
      requiresStaff: true,
      category: { select: { id: true, name: true, slug: true } },
      resourceRequirements: { select: { resourceType: true, quantity: true } },
      provider: {
        select: {
          id: true,
          slug: true,
          name: true,
          specialty: true,
          district: true,
          city: true,
          status: true,
          coverImageUrl: true,
          ratingAverage: true,
          ratingCount: true,
          cancellationPolicy: true,
          cancellationWindowHours: true,
        },
      },
      staffLinks: {
        where: { staff: { active: true } },
        select: {
          staff: {
            select: {
              id: true,
              name: true,
              role: true,
              credentials: true,
              specializations: true,
              languages: true,
              yearsExperience: true,
              verified: true,
            },
          },
        },
      },
    },
  });
}

export interface TreatmentSearchParams {
  query?: string;
  categorySlug?: string;
  maxPriceMinor?: number;
  sort?: "recommended" | "price_asc" | "price_desc" | "rating";
  page?: number;
  perPage?: number;
}

export async function searchTreatments(params: TreatmentSearchParams) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(params.perPage ?? 18, 48);

  const where: Prisma.ServiceWhereInput = { active: true, provider: PUBLIC_PROVIDER };
  const and: Prisma.ServiceWhereInput[] = [];

  if (params.query) {
    and.push({
      OR: [
        { name: { contains: params.query, mode: "insensitive" } },
        { description: { contains: params.query, mode: "insensitive" } },
        { provider: { name: { contains: params.query, mode: "insensitive" } } },
      ],
    });
  }
  if (params.categorySlug) and.push({ category: { slug: params.categorySlug } });
  if (typeof params.maxPriceMinor === "number") and.push({ priceMinor: { lte: params.maxPriceMinor } });
  if (and.length) where.AND = and;

  const orderBy: Prisma.ServiceOrderByWithRelationInput[] =
    params.sort === "price_asc"
      ? [{ priceMinor: "asc" }]
      : params.sort === "price_desc"
        ? [{ priceMinor: "desc" }]
        : params.sort === "rating"
          ? [{ provider: { ratingAverage: "desc" } }]
          : [{ provider: { ratingAverage: "desc" } }, { priceMinor: "asc" }];

  const [total, services] = await Promise.all([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceMinor: true,
        currency: true,
        serviceClass: true,
        isMedicalAesthetic: true,
        category: { select: { name: true, slug: true } },
        provider: {
          select: {
            id: true,
            slug: true,
            name: true,
            district: true,
            city: true,
            status: true,
            ratingAverage: true,
            ratingCount: true,
          },
        },
      },
    }),
  ]);

  return { services, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      _count: { select: { services: { where: { active: true, provider: PUBLIC_PROVIDER } } } },
    },
  });
}

/** Distinct districts across visible clinics, for the location filter. */
export async function getLocations(): Promise<string[]> {
  const rows = await prisma.provider.findMany({
    where: PUBLIC_PROVIDER,
    select: { district: true, city: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
  });
  return rows
    .map((r) => (r.district ? `${r.district}, ${r.city}` : r.city))
    .filter((v, i, all) => all.indexOf(v) === i);
}
