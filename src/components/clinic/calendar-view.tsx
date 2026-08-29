"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingStatusPill } from "@/components/ui/status";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/states";
import { AnimatePresence, FadeIn } from "@/components/ui/motion";
import { addDays } from "@/components/booking/date-picker";
import { cn } from "@/lib/utils";

export interface CalendarBooking {
  id: string;
  reference: string;
  status: string;
  startAt: string;
  endAt: string;
  startMinute: number;
  endMinute: number;
  dateKey: string;
  customerName: string;
  serviceName: string;
  staffId: string | null;
  staffName: string | null;
  resources: string[];
}

export interface CalendarException {
  id: string;
  dateKey: string;
  type: string;
  startMinute: number | null;
  endMinute: number | null;
  reason: string | null;
  staffName: string | null;
}

type View = "day" | "week" | "month";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Clinic calendar.
 *
 * Day and week are laid out on a real time axis so that gaps read as gaps —
 * a list of appointments hides exactly the thing a clinic looks at a calendar
 * for. Month is a density view for planning further out.
 */
export function ClinicCalendar({
  initialDate,
  bookings,
  exceptions,
  staff,
  services,
  openMinute,
  closeMinute,
}: {
  initialDate: string;
  bookings: CalendarBooking[];
  exceptions: CalendarException[];
  staff: { id: string; name: string; role: string }[];
  services: { id: string; name: string; durationMinutes: number }[];
  openMinute: number;
  closeMinute: number;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<View>("week");
  const [anchor, setAnchor] = React.useState(initialDate);
  const [blockOpen, setBlockOpen] = React.useState(false);

  function shift(direction: 1 | -1) {
    const step = view === "day" ? 1 : view === "week" ? 7 : 28;
    const next = addDays(anchor, direction * step);
    setAnchor(next);
    router.push(`/clinic/calendar?date=${next}&view=${view}`);
  }

  function changeView(next: View) {
    setView(next);
    router.push(`/clinic/calendar?date=${anchor}&view=${next}`);
  }

  const days =
    view === "day"
      ? [anchor]
      : view === "week"
        ? weekOf(anchor)
        : monthGrid(anchor);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => shift(-1)} aria-label="Previous period">
            <ChevronLeft aria-hidden className="size-3.5" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => shift(1)} aria-label="Next period">
            <ChevronRight aria-hidden className="size-3.5" />
          </Button>
        </div>

        <p className="text-[0.875rem] font-medium text-navy-600">{rangeLabel(view, anchor)}</p>

        <div
          role="radiogroup"
          aria-label="Calendar view"
          className="ml-auto flex rounded-md border border-line bg-surface p-0.5"
        >
          {(["day", "week", "month"] as View[]).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={view === option}
              onClick={() => changeView(option)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-[0.8125rem] font-medium capitalize transition-colors",
                view === option ? "bg-navy-600 text-white" : "text-ink-muted hover:text-navy-600",
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={() => setBlockOpen(true)}>
          <Plus aria-hidden className="size-3.5" />
          Block time
        </Button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <FadeIn key={`${view}-${anchor}`}>
          {view === "month" ? (
            <MonthGrid days={days} bookings={bookings} exceptions={exceptions} anchor={anchor} />
          ) : (
            <TimeGrid
              days={days}
              bookings={bookings}
              exceptions={exceptions}
              openMinute={openMinute}
              closeMinute={closeMinute}
              staff={staff}
            />
          )}
        </FadeIn>
      </AnimatePresence>

      <BlockTimeDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        defaultDate={anchor}
        staff={staff}
        onSaved={() => {
          setBlockOpen(false);
          router.refresh();
        }}
      />
      {/* services are used by the front-desk booking flow on the bookings page */}
      <span hidden>{services.length}</span>
    </>
  );
}

function TimeGrid({
  days,
  bookings,
  exceptions,
  openMinute,
  closeMinute,
  staff,
}: {
  days: string[];
  bookings: CalendarBooking[];
  exceptions: CalendarException[];
  openMinute: number;
  closeMinute: number;
  staff: { id: string; name: string }[];
}) {
  const start = Math.max(0, Math.floor(openMinute / 60) * 60 - 60);
  const end = Math.min(1440, Math.ceil(closeMinute / 60) * 60 + 60);
  const hours = Math.max(1, (end - start) / 60);
  const pxPerMinute = 1.1;
  const height = (end - start) * pxPerMinute;

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <div className="min-w-[44rem]">
        <div
          className="grid border-b border-line"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div />
          {days.map((day) => {
            const closed = exceptions.some((e) => e.dateKey === day && e.type === "CLOSED");
            return (
              <div key={day} className="border-l border-line px-2 py-2 text-center">
                <p className="text-[0.6875rem] uppercase tracking-wide text-ink-subtle">
                  {weekdayLabel(day)}
                </p>
                <p className="text-[0.875rem] font-semibold text-navy-600 tabular">
                  {day.slice(8)}
                </p>
                {closed && <Badge tone="neutral" className="mt-1">Closed</Badge>}
              </div>
            );
          })}
        </div>

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))`,
            height: `${height}px`,
          }}
        >
          <div className="relative">
            {Array.from({ length: hours }).map((_, i) => (
              <div
                key={i}
                className="absolute right-2 -translate-y-1/2 text-[0.6875rem] text-ink-subtle tabular"
                style={{ top: `${i * 60 * pxPerMinute}px` }}
              >
                {String(Math.floor((start + i * 60) / 60)).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayBookings = bookings.filter((b) => b.dateKey === day);
            const dayExceptions = exceptions.filter((e) => e.dateKey === day);

            return (
              <div key={day} className="relative border-l border-line">
                {Array.from({ length: hours }).map((_, i) => (
                  <div
                    key={i}
                    aria-hidden
                    className="absolute inset-x-0 border-t border-line/60"
                    style={{ top: `${i * 60 * pxPerMinute}px` }}
                  />
                ))}

                {/* Closures and time off, drawn behind appointments. */}
                {dayExceptions.map((exception) => {
                  const from = exception.type === "CLOSED" ? start : (exception.startMinute ?? start);
                  const to = exception.type === "CLOSED" ? end : (exception.endMinute ?? end);
                  return (
                    <div
                      key={exception.id}
                      className="absolute inset-x-1 rounded-sm border border-dashed border-line-strong bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(100,114,119,0.07)_6px,rgba(100,114,119,0.07)_12px)] px-1.5 py-1"
                      style={{
                        top: `${(from - start) * pxPerMinute}px`,
                        height: `${Math.max(18, (to - from) * pxPerMinute)}px`,
                      }}
                    >
                      <p className="truncate text-[0.625rem] font-medium text-ink-muted">
                        {exception.type === "CLOSED"
                          ? "Closed"
                          : exception.staffName
                            ? `${exception.staffName} unavailable`
                            : "Blocked"}
                        {exception.reason ? ` · ${exception.reason}` : ""}
                      </p>
                    </div>
                  );
                })}

                {dayBookings.map((booking) => {
                  // Side-by-side lanes when appointments overlap.
                  const overlapping = dayBookings.filter(
                    (other) =>
                      other.startMinute < booking.endMinute && booking.startMinute < other.endMinute,
                  );
                  const lane = overlapping.findIndex((o) => o.id === booking.id);
                  const lanes = Math.max(1, overlapping.length);

                  // Only show as much as fits: a 30-minute block cannot hold
                  // three lines, and clipped text reads as a rendering fault.
                  const height = Math.max(
                    22,
                    (booking.endMinute - booking.startMinute) * pxPerMinute,
                  );
                  const showService = height >= 34;
                  const showStaff = height >= 50;

                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        "absolute overflow-hidden rounded-sm border px-1.5 py-1",
                        booking.status === "CONFIRMED" && "border-teal-300 bg-teal-50",
                        booking.status === "PENDING_PAYMENT" && "border-[#e8d7b9] bg-warning-bg",
                        booking.status === "COMPLETED" && "border-navy-100 bg-navy-50",
                        booking.status === "NO_SHOW" && "border-[#e6cccc] bg-danger-bg",
                      )}
                      style={{
                        top: `${(booking.startMinute - start) * pxPerMinute}px`,
                        height: `${height}px`,
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                      }}
                      title={`${booking.customerName} · ${booking.serviceName}${booking.staffName ? ` · ${booking.staffName}` : ""}${booking.resources.length ? ` · ${booking.resources.join(", ")}` : ""}`}
                    >
                      <p className="truncate text-[0.625rem] font-semibold leading-tight text-navy-700 tabular">
                        {minuteLabel(booking.startMinute)} {booking.customerName}
                      </p>
                      {showService && (
                        <p className="truncate text-[0.625rem] leading-tight text-ink-muted">
                          {booking.serviceName}
                        </p>
                      )}
                      {showStaff && booking.staffName && (
                        <p className="truncate text-[0.625rem] leading-tight text-ink-subtle">
                          {booking.staffName}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {staff.length === 0 && (
        <EmptyState
          title="No practitioners yet"
          description="Add a practitioner before taking appointments."
          className="py-8"
        />
      )}
    </div>
  );
}

function MonthGrid({
  days,
  bookings,
  exceptions,
  anchor,
}: {
  days: string[];
  bookings: CalendarBooking[];
  exceptions: CalendarException[];
  anchor: string;
}) {
  const anchorMonth = anchor.slice(0, 7);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[0.6875rem] uppercase tracking-wide text-ink-subtle"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayBookings = bookings.filter((b) => b.dateKey === day);
          const closed = exceptions.some((e) => e.dateKey === day && e.type === "CLOSED");
          const otherMonth = day.slice(0, 7) !== anchorMonth;

          return (
            <div
              key={day}
              className={cn(
                "min-h-24 border-b border-l border-line p-1.5 first:border-l-0",
                otherMonth && "bg-canvas/50",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[0.75rem] font-medium tabular",
                    otherMonth ? "text-ink-subtle" : "text-navy-600",
                  )}
                >
                  {day.slice(8)}
                </span>
                {closed && <span className="text-[0.625rem] text-ink-subtle">Closed</span>}
              </div>

              <div className="mt-1 space-y-0.5">
                {dayBookings.slice(0, 3).map((booking) => (
                  <p
                    key={booking.id}
                    className="truncate rounded-xs bg-teal-50 px-1 py-px text-[0.625rem] text-navy-700"
                    title={`${booking.customerName} · ${booking.serviceName}`}
                  >
                    {minuteLabel(booking.startMinute)} {booking.customerName}
                  </p>
                ))}
                {dayBookings.length > 3 && (
                  <p className="px-1 text-[0.625rem] text-ink-muted">
                    +{dayBookings.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlockTimeDialog({
  open,
  onClose,
  defaultDate,
  staff,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  staff: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [type, setType] = React.useState<"CLOSED" | "TIME_OFF" | "MODIFIED_HOURS">("TIME_OFF");
  const [date, setDate] = React.useState(defaultDate);
  const [from, setFrom] = React.useState("12:00");
  const [to, setTo] = React.useState("13:00");
  const [staffId, setStaffId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => setDate(defaultDate), [defaultDate]);

  async function save() {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/clinic/schedule/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          type,
          startMinute: type === "CLOSED" ? null : toMinutes(from),
          endMinute: type === "CLOSED" ? null : toMinutes(to),
          staffId: staffId || null,
          reason,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "We could not save this.");
        setPending(false);
        return;
      }
      if (body.affectedBookings > 0) {
        // Existing appointments are never silently removed.
        setNotice(
          `Saved. ${body.affectedBookings} existing ${body.affectedBookings === 1 ? "appointment" : "appointments"} on this date ${body.affectedBookings === 1 ? "is" : "are"} unaffected — cancel or move ${body.affectedBookings === 1 ? "it" : "them"} from Appointments if needed.`,
        );
        setPending(false);
        return;
      }
      onSaved();
    } catch {
      setError("We could not reach the server. Please try again.");
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Block time"
      description="Close the clinic for a day, shorten its hours, or mark a practitioner unavailable."
      footer={
        notice ? (
          <Button onClick={onSaved}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void save()}>
              Save
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {error && <FormError>{error}</FormError>}
        {notice && (
          <div className="rounded-md border border-[#e8d7b9] bg-warning-bg px-3 py-2.5 text-[0.8125rem] text-warning">
            {notice}
          </div>
        )}

        {!notice && (
          <>
            <Field label="Type" required>
              {(props) => (
                <Select
                  {...props}
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                  data-autofocus
                >
                  <option value="TIME_OFF">Block a period</option>
                  <option value="CLOSED">Closed all day</option>
                  <option value="MODIFIED_HOURS">Different hours this day</option>
                </Select>
              )}
            </Field>

            <Field label="Date" required>
              {(props) => (
                <Input {...props} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              )}
            </Field>

            {type !== "CLOSED" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="From" required>
                  {(props) => (
                    <Input {...props} type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
                  )}
                </Field>
                <Field label="To" required>
                  {(props) => (
                    <Input {...props} type="time" value={to} onChange={(e) => setTo(e.target.value)} />
                  )}
                </Field>
              </div>
            )}

            <Field
              label="Applies to"
              hint="Leave as the whole clinic, or restrict it to one practitioner."
            >
              {(props) => (
                <Select {...props} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                  <option value="">The whole clinic</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Reason" hint="Shown on your calendar only." optional>
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Public holiday, training, equipment service…"
                />
              )}
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}

export function CalendarEmpty() {
  return (
    <EmptyState
      icon={CalendarOff}
      title="Nothing scheduled in this period"
      description="Appointments booked on Suay and entered at your front desk both appear here."
    />
  );
}

// --- date helpers ----------------------------------------------------------

function weekOf(dateKey: string): string[] {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  const dow = (date.getUTCDay() + 6) % 7; // Monday-first
  const monday = addDays(dateKey, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function monthGrid(dateKey: string): string[] {
  const [y, m] = dateKey.split("-").map(Number);
  const firstOfMonth = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
  const firstDow = (new Date(`${firstOfMonth}T00:00:00Z`).getUTCDay() + 6) % 7;
  const gridStart = addDays(firstOfMonth, -firstDow);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function rangeLabel(view: View, anchor: string): string {
  const [y, m, d] = anchor.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  if (view === "month") {
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
  if (view === "day") {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(date);
  }
  const week = weekOf(anchor);
  const startDate = new Date(`${week[0]}T00:00:00Z`);
  const endDate = new Date(`${week[6]}T00:00:00Z`);
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
}

function weekdayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${dateKey}T00:00:00Z`),
  );
}

function minuteLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function toMinutes(label: string): number {
  const [h, m] = label.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
