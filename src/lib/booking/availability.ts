import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getPolicy, type PlatformPolicy } from "@/lib/config";
import { NotFoundError } from "@/lib/errors";
import {
  addDays,
  dateColumnToKey,
  dateKeyToDateColumn,
  dayOfWeekOfKey,
  minutesToLabel,
  zonedTimeToUtc,
  type DateKey,
} from "@/lib/time";
import {
  contains,
  intersect,
  normalize,
  overlaps,
  subtract,
  type Interval,
} from "@/lib/booking/intervals";
import { expireStaleHolds } from "@/lib/booking/holds";

/**
 * Availability.
 *
 * A time is offered only when *everything* the treatment needs is free at
 * once: the clinic is open, a qualified practitioner is on shift, and every
 * required room and piece of equipment has a free unit. If the practitioner is
 * free but the room is not, the slot is not offered.
 *
 * Buffers are part of occupancy. A 60-minute treatment with a 10-minute
 * turnaround occupies 70 minutes of the calendar but is shown to the customer
 * as the 60 minutes they actually attend.
 */

export interface SlotAssignment {
  staffId: string | null;
  resourceIds: string[];
}

export interface AvailableSlot {
  /** Local start time, e.g. "16:30". */
  label: string;
  startMinute: number;
  startAt: string;
  endAt: string;
  staffId: string | null;
  staffName: string | null;
  /** Every practitioner who could take this slot, for customer choice. */
  staffOptions: { id: string; name: string }[];
}

export interface DayAvailability {
  date: DateKey;
  /** False when the clinic is closed or fully booked that day. */
  isOpen: boolean;
  closedReason: string | null;
  slots: AvailableSlot[];
}

interface AvailabilityContext {
  provider: { id: string; timezone: string };
  service: {
    id: string;
    durationMinutes: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    requiresStaff: boolean;
    requirements: { resourceType: "ROOM" | "EQUIPMENT"; resourceTag: string | null; quantity: number }[];
  };
  staff: { id: string; name: string; sortOrder: number }[];
  resources: { id: string; type: "ROOM" | "EQUIPMENT"; tag: string | null }[];
  providerRules: Map<number, Interval[]>;
  staffRules: Map<string, Map<number, Interval[]>>;
  providerExceptions: Map<DateKey, ExceptionRow[]>;
  staffExceptions: Map<string, Map<DateKey, ExceptionRow[]>>;
  staffBusy: Map<string, { start: Date; end: Date }[]>;
  resourceBusy: Map<string, { start: Date; end: Date }[]>;
  policy: PlatformPolicy;
}

interface ExceptionRow {
  type: "CLOSED" | "MODIFIED_HOURS" | "TIME_OFF";
  startMinute: number | null;
  endMinute: number | null;
  reason: string | null;
}

export interface AvailabilityQuery {
  providerId: string;
  serviceId: string;
  from: DateKey;
  /** Inclusive. Defaults to `from`. */
  to?: DateKey;
  /** Restrict to one practitioner (customer picked a specific person). */
  staffId?: string | null;
  /**
   * Ignore a booking's own occupancy — used when rescheduling so the
   * appointment being moved does not block its own new time.
   */
  excludeBookingId?: string | null;
  /** Provider-side views may offer times inside the minimum-notice window. */
  ignoreMinNotice?: boolean;
  now?: Date;
}

export async function getAvailability(query: AvailabilityQuery): Promise<DayAvailability[]> {
  await expireStaleHolds();

  const to = query.to ?? query.from;
  const ctx = await loadContext(query, to);
  const now = query.now ?? new Date();

  const days: DayAvailability[] = [];
  for (let cursor = query.from; cursor <= to; cursor = addDays(cursor, 1)) {
    days.push(computeDay(ctx, cursor, query, now));
  }
  return days;
}

/** First bookable time from `from` onwards, or null within the search window. */
export async function findNextAvailable(
  providerId: string,
  serviceId: string,
  options: { from?: DateKey; days?: number; now?: Date } = {},
): Promise<{ date: DateKey; slot: AvailableSlot } | null> {
  const now = options.now ?? new Date();
  const from = options.from ?? dateKeyInZone(now, providerId);
  const policy = await getPolicy();
  const span = Math.min(options.days ?? 14, policy.maxAdvanceDays);

  const days = await getAvailability({
    providerId,
    serviceId,
    from,
    to: addDays(from, span - 1),
    now,
  });

  for (const day of days) {
    if (day.slots.length > 0) return { date: day.date, slot: day.slots[0]! };
  }
  return null;
}

/**
 * Resolve one specific requested time into a concrete assignment of
 * practitioner and resources, or return null when it is not bookable.
 *
 * The booking transaction calls this, then relies on the database exclusion
 * constraints to settle any race with a concurrent request.
 */
export async function resolveSlot(input: {
  providerId: string;
  serviceId: string;
  startAt: Date;
  staffId?: string | null;
  excludeBookingId?: string | null;
  ignoreMinNotice?: boolean;
  now?: Date;
  tx?: Prisma.TransactionClient;
}): Promise<{
  startAt: Date;
  endAt: Date;
  blockStartAt: Date;
  blockEndAt: Date;
  durationMinutes: number;
  staffId: string | null;
  resourceIds: string[];
} | null> {
  const client = input.tx ?? prisma;
  const provider = await client.provider.findUnique({
    where: { id: input.providerId },
    select: { id: true, timezone: true },
  });
  if (!provider) throw new NotFoundError("Clinic not found.");

  const dateKey = dateKeyOfInstant(input.startAt, provider.timezone);
  const ctx = await loadContext(
    {
      providerId: input.providerId,
      serviceId: input.serviceId,
      from: dateKey,
      staffId: input.staffId,
      excludeBookingId: input.excludeBookingId,
    },
    dateKey,
    client,
  );

  const day = computeDay(
    ctx,
    dateKey,
    {
      providerId: input.providerId,
      serviceId: input.serviceId,
      from: dateKey,
      staffId: input.staffId,
      excludeBookingId: input.excludeBookingId,
      ignoreMinNotice: input.ignoreMinNotice,
    },
    input.now ?? new Date(),
  );

  const target = input.startAt.getTime();
  const slot = day.slots.find((s) => new Date(s.startAt).getTime() === target);
  if (!slot) return null;

  const startAt = new Date(slot.startAt);
  const endAt = new Date(slot.endAt);
  const staffId = input.staffId ?? slot.staffId;

  if (input.staffId && !slot.staffOptions.some((o) => o.id === input.staffId)) return null;

  const resourceIds = pickResources(ctx, startAt, endAt, input.excludeBookingId ?? null);
  if (resourceIds === null) return null;

  return {
    startAt,
    endAt,
    blockStartAt: new Date(startAt.getTime() - ctx.service.bufferBeforeMinutes * 60_000),
    blockEndAt: new Date(endAt.getTime() + ctx.service.bufferAfterMinutes * 60_000),
    durationMinutes: ctx.service.durationMinutes,
    staffId: ctx.service.requiresStaff ? staffId : null,
    resourceIds,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function loadContext(
  query: AvailabilityQuery,
  to: DateKey,
  client: Prisma.TransactionClient = prisma,
): Promise<AvailabilityContext> {
  const [provider, service, policy] = await Promise.all([
    client.provider.findUnique({
      where: { id: query.providerId },
      select: { id: true, timezone: true },
    }),
    client.service.findFirst({
      where: { id: query.serviceId, providerId: query.providerId },
      select: {
        id: true,
        durationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
        requiresStaff: true,
        resourceRequirements: {
          select: { resourceType: true, resourceTag: true, quantity: true },
        },
      },
    }),
    getPolicy(),
  ]);

  if (!provider) throw new NotFoundError("Clinic not found.");
  if (!service) throw new NotFoundError("Treatment not found.");

  const staffRows = await client.staff.findMany({
    where: {
      providerId: query.providerId,
      active: true,
      ...(query.staffId ? { id: query.staffId } : {}),
      ...(service.requiresStaff ? { services: { some: { serviceId: service.id } } } : {}),
    },
    select: { id: true, name: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const resources = await client.resource.findMany({
    where: { providerId: query.providerId, active: true },
    select: { id: true, type: true, tag: true },
    orderBy: { name: "asc" },
  });

  const staffIds = staffRows.map((s) => s.id);
  const resourceIds = resources.map((r) => r.id);

  const rangeStart = zonedTimeToUtc(query.from, -720, provider.timezone);
  const rangeEnd = zonedTimeToUtc(addDays(to, 1), 720, provider.timezone);

  const [rules, exceptions, staffBusyRows, resourceBusyRows] = await Promise.all([
    client.scheduleRule.findMany({
      where: {
        providerId: query.providerId,
        OR: [{ ownerType: "PROVIDER" }, { staffId: { in: staffIds } }],
      },
      select: { ownerType: true, staffId: true, dayOfWeek: true, startMinute: true, endMinute: true },
    }),
    client.scheduleException.findMany({
      where: {
        providerId: query.providerId,
        date: { gte: dateKeyToDateColumn(query.from), lte: dateKeyToDateColumn(to) },
      },
      select: { staffId: true, date: true, type: true, startMinute: true, endMinute: true, reason: true },
    }),
    staffIds.length
      ? client.bookingStaffAssignment.findMany({
          where: {
            staffId: { in: staffIds },
            active: true,
            blockStartAt: { lt: rangeEnd },
            blockEndAt: { gt: rangeStart },
            ...(query.excludeBookingId ? { bookingId: { not: query.excludeBookingId } } : {}),
          },
          select: { staffId: true, blockStartAt: true, blockEndAt: true },
        })
      : Promise.resolve([]),
    resourceIds.length
      ? client.bookingResourceAssignment.findMany({
          where: {
            resourceId: { in: resourceIds },
            active: true,
            blockStartAt: { lt: rangeEnd },
            blockEndAt: { gt: rangeStart },
            ...(query.excludeBookingId ? { bookingId: { not: query.excludeBookingId } } : {}),
          },
          select: { resourceId: true, blockStartAt: true, blockEndAt: true },
        })
      : Promise.resolve([]),
  ]);

  const providerRules = new Map<number, Interval[]>();
  const staffRules = new Map<string, Map<number, Interval[]>>();
  for (const rule of rules) {
    const interval = { start: rule.startMinute, end: rule.endMinute };
    if (rule.ownerType === "PROVIDER") {
      push(providerRules, rule.dayOfWeek, interval);
    } else if (rule.staffId) {
      let perStaff = staffRules.get(rule.staffId);
      if (!perStaff) {
        perStaff = new Map();
        staffRules.set(rule.staffId, perStaff);
      }
      push(perStaff, rule.dayOfWeek, interval);
    }
  }

  const providerExceptions = new Map<DateKey, ExceptionRow[]>();
  const staffExceptions = new Map<string, Map<DateKey, ExceptionRow[]>>();
  for (const ex of exceptions) {
    const key = dateColumnToKey(ex.date);
    const row: ExceptionRow = {
      type: ex.type,
      startMinute: ex.startMinute,
      endMinute: ex.endMinute,
      reason: ex.reason,
    };
    if (!ex.staffId) {
      providerExceptions.set(key, [...(providerExceptions.get(key) ?? []), row]);
    } else {
      let perStaff = staffExceptions.get(ex.staffId);
      if (!perStaff) {
        perStaff = new Map();
        staffExceptions.set(ex.staffId, perStaff);
      }
      perStaff.set(key, [...(perStaff.get(key) ?? []), row]);
    }
  }

  const staffBusy = new Map<string, { start: Date; end: Date }[]>();
  for (const row of staffBusyRows) {
    staffBusy.set(row.staffId, [
      ...(staffBusy.get(row.staffId) ?? []),
      { start: row.blockStartAt, end: row.blockEndAt },
    ]);
  }

  const resourceBusy = new Map<string, { start: Date; end: Date }[]>();
  for (const row of resourceBusyRows) {
    resourceBusy.set(row.resourceId, [
      ...(resourceBusy.get(row.resourceId) ?? []),
      { start: row.blockStartAt, end: row.blockEndAt },
    ]);
  }

  return {
    provider,
    service: { ...service, requirements: service.resourceRequirements },
    staff: staffRows,
    resources,
    providerRules,
    staffRules,
    providerExceptions,
    staffExceptions,
    staffBusy,
    resourceBusy,
    policy,
  };
}

function computeDay(
  ctx: AvailabilityContext,
  date: DateKey,
  query: AvailabilityQuery,
  now: Date,
): DayAvailability {
  const dow = dayOfWeekOfKey(date);
  const tz = ctx.provider.timezone;

  const clinicExceptions = ctx.providerExceptions.get(date) ?? [];
  const closed = clinicExceptions.find((e) => e.type === "CLOSED");
  if (closed) {
    return { date, isOpen: false, closedReason: closed.reason ?? "Clinic closed", slots: [] };
  }

  let clinicOpen = normalize(ctx.providerRules.get(dow) ?? []);

  const modified = clinicExceptions.filter((e) => e.type === "MODIFIED_HOURS");
  if (modified.length > 0) {
    clinicOpen = normalize(
      modified.map((e) => ({ start: e.startMinute ?? 0, end: e.endMinute ?? 1440 })),
    );
  }

  const clinicTimeOff = clinicExceptions
    .filter((e) => e.type === "TIME_OFF")
    .map((e) => ({ start: e.startMinute ?? 0, end: e.endMinute ?? 1440 }));
  clinicOpen = subtract(clinicOpen, clinicTimeOff);

  if (clinicOpen.length === 0) {
    return { date, isOpen: false, closedReason: "Clinic closed", slots: [] };
  }

  // Working window per practitioner: their own shift if they have one,
  // otherwise the clinic's hours, minus their personal exceptions.
  const staffWindows = new Map<string, Interval[]>();
  for (const member of ctx.staff) {
    const own = ctx.staffRules.get(member.id)?.get(dow);
    let window = own && own.length > 0 ? intersect(normalize(own), clinicOpen) : clinicOpen;

    const personal = ctx.staffExceptions.get(member.id)?.get(date) ?? [];
    if (personal.some((e) => e.type === "CLOSED")) {
      staffWindows.set(member.id, []);
      continue;
    }
    const personalModified = personal.filter((e) => e.type === "MODIFIED_HOURS");
    if (personalModified.length > 0) {
      window = intersect(
        window,
        normalize(personalModified.map((e) => ({ start: e.startMinute ?? 0, end: e.endMinute ?? 1440 }))),
      );
    }
    window = subtract(
      window,
      personal
        .filter((e) => e.type === "TIME_OFF")
        .map((e) => ({ start: e.startMinute ?? 0, end: e.endMinute ?? 1440 })),
    );
    staffWindows.set(member.id, window);
  }

  const { durationMinutes, bufferBeforeMinutes, bufferAfterMinutes, requiresStaff } = ctx.service;
  const step = ctx.policy.slotIntervalMinutes;
  const minNoticeMs = query.ignoreMinNotice ? 0 : ctx.policy.minNoticeMinutes * 60_000;
  const earliest = now.getTime() + minNoticeMs;
  const latest = now.getTime() + ctx.policy.maxAdvanceDays * 86_400_000;

  const slots: AvailableSlot[] = [];

  for (const window of clinicOpen) {
    const firstStart = Math.ceil(window.start / step) * step;
    for (let minute = firstStart; minute + durationMinutes <= window.end; minute += step) {
      const startAt = zonedTimeToUtc(date, minute, tz);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

      if (startAt.getTime() < earliest) continue;
      if (startAt.getTime() > latest) continue;

      const blockStart = new Date(startAt.getTime() - bufferBeforeMinutes * 60_000);
      const blockEnd = new Date(endAt.getTime() + bufferAfterMinutes * 60_000);

      // The appointment itself must sit inside opening hours; buffers may
      // spill into the turnaround time before opening or after closing.
      if (!contains(clinicOpen, minute, minute + durationMinutes)) continue;

      const freeStaff = requiresStaff
        ? ctx.staff.filter((member) => {
            const window2 = staffWindows.get(member.id) ?? [];
            if (!contains(window2, minute, minute + durationMinutes)) return false;
            return !isBusy(ctx.staffBusy.get(member.id), blockStart, blockEnd);
          })
        : [];

      if (requiresStaff && freeStaff.length === 0) continue;

      if (pickResources(ctx, startAt, endAt, query.excludeBookingId ?? null) === null) continue;

      slots.push({
        label: minutesToLabel(minute),
        startMinute: minute,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        staffId: freeStaff[0]?.id ?? null,
        staffName: freeStaff[0]?.name ?? null,
        staffOptions: freeStaff.map((s) => ({ id: s.id, name: s.name })),
      });
    }
  }

  return { date, isOpen: true, closedReason: null, slots };
}

/**
 * Choose concrete resources for one appointment.
 *
 * Returns the chosen ids, or null when some requirement cannot be met. A
 * resource is never assigned twice within the same booking.
 */
function pickResources(
  ctx: AvailabilityContext,
  startAt: Date,
  endAt: Date,
  _excludeBookingId: string | null,
): string[] | null {
  if (ctx.service.requirements.length === 0) return [];

  const blockStart = new Date(startAt.getTime() - ctx.service.bufferBeforeMinutes * 60_000);
  const blockEnd = new Date(endAt.getTime() + ctx.service.bufferAfterMinutes * 60_000);

  const chosen: string[] = [];
  for (const requirement of ctx.service.requirements) {
    const candidates = ctx.resources.filter(
      (r) =>
        r.type === requirement.resourceType &&
        (!requirement.resourceTag || r.tag === requirement.resourceTag) &&
        !chosen.includes(r.id) &&
        !isBusy(ctx.resourceBusy.get(r.id), blockStart, blockEnd),
    );

    if (candidates.length < requirement.quantity) return null;
    for (let i = 0; i < requirement.quantity; i += 1) chosen.push(candidates[i]!.id);
  }

  return chosen;
}

function isBusy(
  windows: { start: Date; end: Date }[] | undefined,
  start: Date,
  end: Date,
): boolean {
  if (!windows) return false;
  return windows.some((w) => overlaps(start, end, w.start, w.end));
}

function push(map: Map<number, Interval[]>, key: number, value: Interval): void {
  map.set(key, [...(map.get(key) ?? []), value]);
}

function dateKeyOfInstant(instant: Date, timezone: string): DateKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  return parts;
}

function dateKeyInZone(now: Date, _providerId: string): DateKey {
  return dateKeyOfInstant(now, process.env.PLATFORM_TIMEZONE ?? "Asia/Bangkok");
}
