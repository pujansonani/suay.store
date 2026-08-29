# Database

PostgreSQL 16 via Prisma. Schema in `prisma/schema.prisma`, migrations in
`prisma/migrations`.

## Tenancy

`Provider` — a clinic — is the tenant boundary. Every clinic-owned entity carries
`providerId`, so ownership is one `where` clause rather than a join a caller could forget
to write.

```
Provider
├── User            (CLINIC_ADMIN / CLINIC_STAFF members)
├── Service ────────── ServiceResourceRequirement
│                  └── StaffService ── Staff
├── Staff
├── Resource        (ROOM | EQUIPMENT)
├── ScheduleRule    (weekly; clinic-wide or per practitioner)
├── ScheduleException
├── ProviderCustomer
├── Booking ────────── BookingStaffAssignment
│                  ├── BookingResourceAssignment
│                  ├── BookingStatusHistory
│                  ├── BookingAttribution
│                  ├── Payment ── PaymentEvent
│                  └── Review
├── PayoutBatch ────── PayoutLine
└── ProviderVerification
```

`Payment.providerId` is denormalised from its booking so a clinic's payment list is a
single indexed query.

`ProviderCustomer` belongs to exactly one clinic and may optionally link to a platform
`User`. The same person booking at two clinics produces **two** records sharing one
`userId` — each clinic keeps its own contact details and notes, and neither can see the
other's.

## Constraints that carry real weight

`prisma/migrations/*_booking_exclusion_constraints/migration.sql` adds what Prisma's
schema language cannot express.

**Overlap prevention** — the reason double booking is impossible rather than unlikely:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "BookingStaffAssignment"
  ADD CONSTRAINT "booking_staff_no_overlap"
  EXCLUDE USING gist (
    "staffId" WITH =,
    tstzrange("blockStartAt", "blockEndAt", '[)') WITH &&
  ) WHERE ("active");

ALTER TABLE "BookingResourceAssignment"
  ADD CONSTRAINT "booking_resource_no_overlap"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("blockStartAt", "blockEndAt", '[)') WITH &&
  ) WHERE ("active");
```

`'[)'` makes intervals half-open, so back-to-back appointments coexist and overlapping
ones cannot commit. `WHERE (active)` releases capacity when a booking is cancelled or
expires, without deleting the row.

**Sanity checks** that must hold no matter which code path writes:

```sql
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_time_order" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "booking_block_covers_appointment"
    CHECK ("blockStartAt" <= "startAt" AND "blockEndAt" >= "endAt");

ALTER TABLE "Review"  ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "ScheduleRule"
  ADD CONSTRAINT "schedule_rule_minutes"
    CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute"),
  ADD CONSTRAINT "schedule_rule_dow" CHECK ("dayOfWeek" BETWEEN 0 AND 6);
```

**Uniqueness carrying a rule:**

| Key | Rule |
|---|---|
| `Review.bookingId` | One review per appointment |
| `PaymentEvent (gateway, externalEventId)` | Webhook idempotency |
| `ProviderCustomer (providerId, userId)` | One clinic record per person per clinic |
| `Service (providerId, slug)` | Stable per-clinic treatment URLs |
| `BookingStaffAssignment (bookingId, staffId)` | No duplicate assignment rows |

## Conventions

**Time.** Every `DateTime` is `timestamptz(3)` — required by `tstzrange`, and correct
regardless. `ScheduleException.date` is a `DATE`, stored at UTC midnight, because it names
a calendar day rather than an instant. Schedules are in minutes from local midnight.

**Money.** Integer minor units (satang) with a currency code. `priceMinor = 150000` is
฿1,500.00. No currency value is ever a float.

**Deletion.** Anything with history is archived rather than deleted. A treatment or
practitioner with past appointments is deactivated; a clinic is suspended or deactivated.
`onDelete: Cascade` is used only where a child is meaningless without its parent
(assignments, status history). `SetNull` keeps a booking readable after a staff record is
removed.

**Audit.** `AuditLog` is append-only. The application never updates or deletes a row.

## Indexes

Added where a real query pattern needs them, not sprinkled:

| Index | Serves |
|---|---|
| `Provider (status, published)` | Every public marketplace query |
| `Provider (city, district)` | Location search |
| `Booking (providerId, startAt)` | Clinic calendar and appointment list |
| `Booking (customerId, startAt)` | Patient's appointments |
| `Booking (status, holdExpiresAt)` | Hold expiry sweep |
| `Booking_pending_hold_idx` | Partial index — only rows awaiting payment |
| `BookingStaffAssignment (staffId, active)` | Occupancy lookup |
| `BookingResourceAssignment (resourceId, active)` | Occupancy lookup |
| `Payment (providerId, status)` | Clinic earnings |
| `AuditLog (entityType, entityId, createdAt)` | Per-entity history |
| `AuditLog (providerId, createdAt)` | Per-clinic audit trail |

## Enums worth knowing

`ProviderStatus` — `DRAFT → PENDING_REVIEW → APPROVED | CHANGES_REQUESTED | REJECTED`,
with `SUSPENDED` and `DEACTIVATED` reachable from approved. `published` is a **separate**
boolean: approval is the administrator's decision, publication is the clinic's, and public
visibility requires both.

`BookingStatus` — `PENDING_PAYMENT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `EXPIRED`,
`NO_SHOW`, `REJECTED`.

`PaymentStatus` — `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `CANCELLED`, `REFUNDED`,
`PARTIALLY_REFUNDED`. Deliberately independent of booking status.

`ServiceClass` — `WELLNESS`, `AESTHETIC`, `MEDICAL_AESTHETIC`, `MEDICAL`. Drives how a
treatment may be presented; medical and aesthetic procedures never get promotional
styling.

`BookingChannel` / `AttributionSource` — where a booking came from. Recorded for future
commission rules; no commercial logic depends on it yet.

## Migrations

```bash
npm run db:migrate            # create and apply, in development
npm run db:deploy             # apply, in production
npm run db:seed               # demonstration data
npm run setup                 # all three, in order
```

The exclusion constraints live in a hand-written migration because Prisma's schema
language cannot express them. If you reset the database, apply migrations rather than
using `prisma db push` — `db push` would silently skip them and quietly remove the
guarantee the booking engine depends on.

## Data the platform deliberately does not hold

No clinical notes, no medical history, no uploaded identity documents, no card numbers.
`ProviderVerification` records registration and licence *references* and reviewer notes.
Clinics keep patient records in their own clinical systems.
