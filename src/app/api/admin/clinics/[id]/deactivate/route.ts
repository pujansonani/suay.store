import { handler, ok, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { requestIp } from "@/lib/audit";
import { applyClinicDecision } from "@/lib/admin/clinic-decisions";
import { adminSuspendSchema } from "@/lib/validation";

/** A reason is mandatory here — it is audited and sent to the clinic. */
export const POST = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const { reason } = await parseBody(request, adminSuspendSchema);

  const result = await applyClinicDecision({
    providerId: id,
    decision: "deactivate",
    note: reason,
    admin,
    ip: requestIp(request),
  });

  return ok(result);
});
