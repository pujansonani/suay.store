import { z } from "zod";

import { handler, ok, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { getPolicy, setPolicy } from "@/lib/config";
import { recordAudit, requestIp } from "@/lib/audit";

const schema = z.object({
  commissionBps: z.coerce.number().int().min(0).max(5000),
  depositPercent: z.coerce.number().int().min(0).max(100),
  cancellationFreeHours: z.coerce.number().int().min(0).max(168),
  cancellationLateFeePercent: z.coerce.number().int().min(0).max(100),
  holdMinutes: z.coerce.number().int().min(2).max(120),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(120),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  minNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  allowCustomerReschedule: z.boolean(),
  rescheduleFreeHours: z.coerce.number().int().min(0).max(168),
  maxReschedulesPerBooking: z.coerce.number().int().min(0).max(10),
});

export const GET = handler(async () => {
  await requireAdmin();
  return ok({ policy: await getPolicy() });
});

/**
 * Change platform policy.
 *
 * These are the knobs the booking and payment code reads at runtime —
 * commission, deposit, cancellation window, hold length — so they can change
 * without a deploy. Every change is audited with a before/after.
 */
export const PUT = handler(async (request: Request) => {
  const admin = await requireAdmin();
  const patch = await parseBody(request, schema);

  const before = await getPolicy();
  const after = await setPolicy(patch, admin.id);

  const changed: Record<string, { from: number | boolean; to: number | boolean }> = {};
  for (const key of Object.keys(after) as (keyof typeof after)[]) {
    if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] };
  }

  await recordAudit({
    action: "settings.updated",
    entityType: "PlatformSetting",
    entityId: "platform.policy",
    actorId: admin.id,
    actorRole: "ADMIN",
    actorLabel: admin.name,
    summary: `Platform policy updated (${Object.keys(changed).length} changes)`,
    metadata: { changed },
    ip: requestIp(request),
  });

  return ok({ policy: after });
});
