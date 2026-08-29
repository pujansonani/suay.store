# Booking engine

The most important system in the product, and the one where being approximately right is
not good enough.

## What "available" means

A time is offered only when **everything the treatment needs is free at once**:

1. The clinic is open (weekly hours, minus one-off exceptions).
2. A practitioner qualified for that treatment is on shift and unbooked.
3. Every required room has a free unit.
4. Every required device has a free unit.
5. The time is inside the booking window and past the minimum-notice threshold.

If the practitioner is free but the room is not, **the slot is not offered.** This is the
difference between a booking system and a calendar with wishful thinking in it.

## Buffers are occupancy

A treatment has `durationMinutes` plus `bufferBeforeMinutes` and `bufferAfterMinutes`.

```
      blockStartAt                                          blockEndAt
      │        startAt                        endAt              │
      ▼        ▼                              ▼                  ▼
      ├────────┼──────────────────────────────┼──────────────────┤
        before          the appointment           turnaround
```

`[startAt, endAt)` is what the patient attends and sees. `[blockStartAt, blockEndAt)` is
what occupies the practitioner, the room and the device, and it is the interval the
database constraints are built on. A 60-minute treatment with a 10-minute turnaround
occupies 70 minutes of the diary and reads as 60 to the patient.

The appointment itself must sit inside opening hours; buffers may spill into the
turnaround time before opening or after closing.

## Schedules

`ScheduleRule` is a recurring weekly period: `(dayOfWeek, startMinute, endMinute)`, in the
clinic's local time. **Multiple rows per weekday express split shifts** — 10:00–14:00 and
16:00–21:00 are two rules, not one range with a hole in it, because that is how Thai
clinics actually work.

Rules may belong to the clinic (`ownerType: PROVIDER`) or to one practitioner
(`ownerType: STAFF`). A practitioner with their own rules works those hours intersected
with the clinic's; one without works the clinic's hours.

`ScheduleException` is a one-off deviation on a date, optionally scoped to one
practitioner:

| Type | Effect |
|---|---|
| `CLOSED` | No availability that day |
| `MODIFIED_HOURS` | Replaces that day's hours entirely |
| `TIME_OFF` | Subtracted from that day's hours |

Adding an exception never cancels existing appointments. It stops new ones being taken and
tells the clinic how many appointments already sit in that window, so someone decides what
to do about them deliberately.

## The algorithm

`getAvailability()` in `src/lib/booking/availability.ts`:

1. **Expire stale holds** so lapsed reservations do not block the calendar.
2. **Load context in a handful of queries** — provider, service and its requirements,
   qualified practitioners, resources, schedule rules, exceptions, and every active
   assignment overlapping the range. Nothing is queried per candidate slot.
3. **Build the clinic's open intervals** for the day: weekly rules, replaced by
   `MODIFIED_HOURS` if present, minus `CLOSED` and `TIME_OFF`.
4. **Build each practitioner's window**: their own rules intersected with the clinic's, or
   the clinic's, minus their personal exceptions.
5. **Walk candidate start times** at the configured granularity through each open
   interval, and for each one check that the appointment fits inside opening hours, that
   at least one qualified practitioner's window covers it and they have no overlapping
   assignment, and that every resource requirement can be satisfied by a free unit.
6. **Return the slots**, each carrying the practitioners who could take it, so the patient
   can choose a person or let the clinic assign one.

Interval arithmetic (`intervals.ts`) — `normalize`, `intersect`, `subtract`, `contains` —
operates on minutes from local midnight. Occupancy checks use absolute instants.

## Timezone

Everything is stored as a UTC instant in `timestamptz`. Schedules are wall-clock
statements about a place: "we open at 10:00" is about Bangkok, not UTC.

`src/lib/time.ts` converts between the two using `Intl`, resolving the offset in two
passes so it stays correct across a daylight-saving boundary. Asia/Bangkok has no DST, but
the platform does not assume that — and there is a test that runs the conversion across a
London transition to prove it.

## Double booking

Availability is computed from a snapshot. Two requests can read that snapshot at the same
instant, both conclude the slot is free, and both proceed. **No amount of checking in
application code fixes this.** The decision has to be made where the writes serialise.

Two occupancy tables carry the interval:

- `BookingStaffAssignment` — `(bookingId, staffId, blockStartAt, blockEndAt, active)`
- `BookingResourceAssignment` — `(bookingId, resourceId, blockStartAt, blockEndAt, active)`

and each has a PostgreSQL exclusion constraint:

```sql
ALTER TABLE "BookingStaffAssignment"
  ADD CONSTRAINT "booking_staff_no_overlap"
  EXCLUDE USING gist (
    "staffId" WITH =,
    tstzrange("blockStartAt", "blockEndAt", '[)') WITH &&
  ) WHERE ("active");
```

Three details matter:

- **`'[)'` — half-open.** 10:00–11:00 and 11:00–12:00 do not overlap and both commit;
  10:00–11:00 and 10:30–11:30 do overlap and the second is refused.
- **`WHERE (active)`.** Cancelled and expired bookings stop occupying the slot without
  their rows being deleted. History survives; capacity is released.
- **`btree_gist`.** Lets an equality test on a text column sit in the same GiST index as
  the range overlap test.

`createBooking()` resolves the slot inside a transaction, inserts the booking and its
assignments, and catches `23P01` — turning it into a `SlotUnavailableError`, which the
patient sees as *"This appointment time is no longer available. Please select another
time."*

`src/tests/booking-engine.test.ts` fires two `createBooking` calls concurrently at the same
practitioner and time and asserts that exactly one resolves, one rejects with
`SlotUnavailableError`, and exactly one active assignment row exists afterwards.

## Temporary holds

```
   create ──► PENDING_PAYMENT ──payment captured──► CONFIRMED
                    │
                    └──hold lapses──► EXPIRED  (assignments deactivated)
```

A held slot is genuinely occupied: its assignment rows are active, so the exclusion
constraints keep everyone else out for real. The countdown the patient sees is not a
persuasion device.

`holdExpiresAt` is set from `policy.holdMinutes` (default 10, configurable in Admin →
Settings). `expireStaleHolds()` moves lapsed holds to `EXPIRED`, deactivates their
assignments, cancels their pending payments and writes a status-history row. It runs at
the start of every availability read and inside the booking transaction — lazily, so the
guarantee does not depend on a worker process being alive.

Clinic-entered bookings (walk-in, phone, LINE) skip the hold and confirm immediately, but
consume exactly the same capacity through exactly the same constraints.

## Booking states

```
PENDING_PAYMENT ─► CONFIRMED ─► COMPLETED
       │                │
       │                ├─► NO_SHOW
       ├─► EXPIRED      └─► CANCELLED
       └─► CANCELLED
```

Every transition writes a `BookingStatusHistory` row with the actor and their role.
Cancellation records `cancelledBy`, `cancelledByRole`, `cancelReason` and `cancelledAt`,
and deactivates assignments rather than deleting them.

## Rescheduling

Never a date change. `rescheduleBooking()` runs the full resolution again — practitioner,
room, equipment, duration, buffers — with the booking's own occupancy excluded so it does
not block itself. Only when a new assignment is found are the old rows dropped and the new
ones claimed, in one transaction, under the same constraints. A failure leaves the
original appointment exactly as it was.

`rescheduleCount` is incremented and checked against `policy.maxReschedulesPerBooking` for
patient-initiated changes. Clinics and administrators are not limited.

## Configuration

Read at runtime from `PlatformSetting`, editable in Admin → Settings:

| Setting | Default | Effect |
|---|---|---|
| `holdMinutes` | 10 | How long a slot is held for payment |
| `slotIntervalMinutes` | 15 | Granularity of offered start times |
| `minNoticeMinutes` | 60 | How soon before an appointment a patient may book |
| `maxAdvanceDays` | 60 | How far ahead patients may book |
| `allowCustomerReschedule` | true | Whether patients may move their own appointments |
| `maxReschedulesPerBooking` | 2 | Patient reschedule limit |

## Performance

- Loading context is a fixed number of queries regardless of how many days are requested;
  slot generation is in-memory interval arithmetic.
- Assignment lookups are bounded by the requested range and hit
  `(staffId, active)` / `(resourceId, active)`.
- `Booking_pending_hold_idx` is a partial index on `holdExpiresAt WHERE status =
  'PENDING_PAYMENT'`, so the expiry sweep touches only candidate rows.
- The public availability endpoint caps a request at 31 days.
