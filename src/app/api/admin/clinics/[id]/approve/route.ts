import { handler, ok, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { requestIp } from "@/lib/audit";
import { applyClinicDecision } from "@/lib/admin/clinic-decisions";
import { adminDecisionSchema } from "@/lib/validation";

export const POST = handler(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const { note } = await parseBody(request, adminDecisionSchema);

  const result = await applyClinicDecision({
    providerId: id,
    decision: "approve",
    note,
    admin,
    ip: requestIp(request),
  });

  return ok(result);
});
