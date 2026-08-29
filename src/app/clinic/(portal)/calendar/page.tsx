import { PageHeader } from "@/components/clinic/page-header";
import { ClinicCalendar } from "@/components/clinic/calendar-view";
import { PageTransition } from "@/components/ui/motion";
import { requireClinicPage } from "@/lib/auth/routes";
import { getClinicCalendar, getClinicServices } from "@/lib/data/clinic";
import { addDays, dateColumnToKey, dateKeyOf, todayKey, zonedParts } from "@/lib/time";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClinicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireClinicPage("/clinic/calendar");
  const params = await searchParams;
  const providerId = session.providerId!;

  const anchor = first(params.date) ?? todayKey();
  const view = (first(params.view) ?? "week") as "day" | "week" | "month";

  // Fetch a window wide enough for whichever view is showing.
  const span = view === "day" ? 1 : view === "week" ? 9 : 45;
  const from = addDays(anchor, view === "month" ? -10 : -2);
  const to = addDays(from, span + 4);

  const [{ bookings, staff, exceptions, rules }, services] = await Promise.all([
    getClinicCalendar(providerId, from, to),
    getClinicServices(providerId),
  ]);

  const openMinute = rules.length > 0 ? Math.min(...rules.map((r) => r.startMinute)) : 9 * 60;
  const closeMinute = rules.length > 0 ? Math.max(...rules.map((r) => r.endMinute)) : 19 * 60;

  return (
    <PageTransition>
      <PageHeader
        title="Calendar"
        description="Appointments, closures and practitioner leave for your clinic, in your clinic's local time."
      />

      <ClinicCalendar
        initialDate={anchor}
        openMinute={openMinute}
        closeMinute={closeMinute}
        staff={staff}
        services={services
          .filter((s) => s.active)
          .map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes }))}
        bookings={bookings.map((booking) => {
          const start = zonedParts(booking.startAt);
          const end = zonedParts(booking.endAt);
          return {
            id: booking.id,
            reference: booking.reference,
            status: booking.status,
            startAt: booking.startAt.toISOString(),
            endAt: booking.endAt.toISOString(),
            startMinute: start.minutes,
            // An appointment that runs past midnight is clamped so it still
            // renders inside its own day column.
            endMinute: end.dateKey === start.dateKey ? end.minutes : 1440,
            dateKey: dateKeyOf(booking.startAt),
            customerName: booking.customerName,
            serviceName: booking.service.name,
            staffId: booking.staff?.id ?? null,
            staffName: booking.staff?.name ?? null,
            resources: booking.resourceAssignments.map((a) => a.resource.name),
          };
        })}
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
