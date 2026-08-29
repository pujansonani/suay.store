import { PageHeader } from "@/components/clinic/page-header";
import { HoursEditor } from "@/components/clinic/hours-editor";
import { ExceptionsList } from "@/components/clinic/exceptions-list";
import { PageTransition } from "@/components/ui/motion";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicSchedule } from "@/lib/data/clinic";
import { dateColumnToKey } from "@/lib/time";

export const metadata = { title: "Working hours" };
export const dynamic = "force-dynamic";

export default async function ClinicSettingsPage() {
  const session = await requireClinicPage("/clinic/settings");
  const { rules, exceptions } = await getClinicSchedule(session.providerId!);

  return (
    <PageTransition className="space-y-8">
      <PageHeader
        title="Working hours"
        description="Your weekly hours and any one-off changes. Availability is generated from these, minus existing appointments."
      />

      <HoursEditor initialRules={rules} />

      <ExceptionsList
        exceptions={exceptions.map((exception) => ({
          id: exception.id,
          dateKey: dateColumnToKey(exception.date),
          type: exception.type,
          startMinute: exception.startMinute,
          endMinute: exception.endMinute,
          reason: exception.reason,
          staffName: exception.staff?.name ?? null,
        }))}
      />
    </PageTransition>
  );
}
