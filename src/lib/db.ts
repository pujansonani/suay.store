import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Postgres raises 23P01 when an exclusion constraint rejects an overlap. */
export const PG_EXCLUSION_VIOLATION = "23P01";
export const PG_UNIQUE_VIOLATION = "23505";

export function isExclusionViolation(error: unknown): boolean {
  return pgErrorCode(error) === PG_EXCLUSION_VIOLATION;
}

export function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === PG_UNIQUE_VIOLATION;
}

function pgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const e = error as { code?: string; meta?: { code?: string }; message?: string };
  // Prisma surfaces raw Postgres codes on P2010 (raw query) and in meta.
  if (e.meta?.code) return e.meta.code;
  if (e.code === PG_EXCLUSION_VIOLATION || e.code === PG_UNIQUE_VIOLATION) return e.code;
  if (e.code === "P2002") return PG_UNIQUE_VIOLATION;
  if (typeof e.message === "string" && e.message.includes("exclusion constraint")) {
    return PG_EXCLUSION_VIOLATION;
  }
  return undefined;
}
