import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireClinicMember } from "@/lib/auth/guards";
import { ValidationError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";
import { scheduleRuleSchema } from "@/lib/validation";
import { getClinicSchedule } from "@/lib/data/clinic";

export const GET = handler(async () => {
  const { providerId } = await requireClinicMember();
  return ok(await getClinicSchedule(providerId));
});

/**
 * Replace the weekly schedule.
 *
 * Sent as a whole set rather than row by row: the editor is a weekly grid, and
 * a partial save would leave the clinic half-open. Staff ids are checked
 * against this clinic before anything is written.
 */
export const PUT = handler(async (request: Request) => {
  const { providerId, user } = await requireClinicMember();
  const { rules } = await parseBody(request, scheduleRuleSchema);

  for (const rule of rules) {
    if (rule.endMinute <= rule.startMinute) {
      throw new ValidationError("Each period must end after it starts.");
    }
  }

  const staffIds = [...new Set(rules.map((r) => r.staffId).filter(Boolean))] as string[];
  const owned = await prisma.staff.findMany({
    where: { providerId, id: { in: staffIds } },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((s) => s.id));

  await prisma.$transaction(async (tx) => {
    await tx.scheduleRule.deleteMany({ where: { providerId } });

    await tx.scheduleRule.createMany({
      data: rules
        .filter((rule) => !rule.staffId || ownedSet.has(rule.staffId))
        .map((rule) => ({
          providerId,
          ownerType: rule.staffId ? ("STAFF" as const) : ("PROVIDER" as const),
          staffId: rule.staffId ?? null,
          dayOfWeek: rule.dayOfWeek,
          startMinute: rule.startMinute,
          endMinute: rule.endMinute,
        })),
    });

    await recordAudit(
      {
        action: "schedule.updated",
        entityType: "Provider",
        entityId: providerId,
        providerId,
        actorId: user.id,
        actorRole: "PROVIDER",
        actorLabel: user.name,
        summary: "Weekly opening hours updated",
        metadata: { periods: rules.length },
      },
      tx,
    );
  });

  return ok({ ok: true });
});
