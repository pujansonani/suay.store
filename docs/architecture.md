# Architecture

## Shape

A single Next.js application, App Router, with three audiences sharing one database.

```
                    ┌──────────────────────────────────────────┐
   Patient  ───────►│  (marketing) — public marketplace        │
                    │  /account/*   — signed-in patient        │
                    └──────────────────────────────────────────┘
                    ┌──────────────────────────────────────────┐
   Clinic   ───────►│  /clinic/register, /clinic/onboarding    │
                    │  /clinic/(portal)/* — approved clinics   │
                    └──────────────────────────────────────────┘
                    ┌──────────────────────────────────────────┐
   Admin    ───────►│  /admin/(panel)/* — platform-wide        │
                    └──────────────────────────────────────────┘
                                      │
                    ┌─────────────────▼────────────────────────┐
                    │ Guards → Services → Prisma → PostgreSQL  │
                    └──────────────────────────────────────────┘
```

The three are separate route groups with separate layouts and separate navigation. They
are not one dashboard with fields hidden by role.

## Layers

**Route handlers and pages** (`src/app`) do four things: establish who is calling,
validate input, call a service, and render or serialise the result. They contain no
business rules.

**Guards** (`src/lib/auth`) are the only sanctioned way to learn who is calling. They
return an identity and, for clinic users, a tenant id — always read from the session
record, never from the request.

**Services** (`src/lib/booking`, `src/lib/payments`, `src/lib/notifications`,
`src/lib/admin`) hold the rules: availability, holds, concurrency, payment state
transitions, clinic lifecycle decisions. They take an actor and a scope as arguments and
enforce ownership against the stored row, inside the same transaction that changes it.

**Data access** (`src/lib/data`) holds read queries, grouped by audience —
`marketplace.ts` (public), `customer.ts`, `clinic.ts` (tenant-scoped), `admin.ts`
(platform-wide). Each clinic function takes `providerId` as its first argument and puts
it in the `where` clause.

**Database** (`prisma/schema.prisma`) is not a passive store. Exclusion constraints,
check constraints and unique keys enforce the invariants that must hold regardless of
which code path writes.

## Where each rule lives

A rule belongs at the lowest layer that can enforce it.

| Rule | Enforced by |
|---|---|
| Two appointments cannot share a practitioner or a room | PostgreSQL exclusion constraint |
| A booking's end is after its start | Check constraint |
| A rating is 1–5 | Check constraint |
| One review per booking | Unique key |
| A webhook event applies once | Unique key on `(gateway, externalEventId)` |
| A clinic sees only its own rows | `providerId` from the session in every `where` |
| Only approved, published clinics are public | `PUBLIC_PROVIDER`, one constant |
| A clinic cannot approve itself | Status is absent from the clinic's own update payload |
| Commission, hold length, cancellation window | `PlatformSetting`, read at runtime |

Nothing important is enforced only in the browser.

## Tenancy

`Provider` is the tenant boundary. Every clinic-owned entity carries `providerId`:
`Service`, `Staff`, `Resource`, `ScheduleRule`, `ScheduleException`, `Booking`,
`ProviderCustomer`, `Payment`, `Review`, `PayoutBatch`.

`Payment.providerId` is denormalised from its booking so that a clinic's payment list is
one indexed query rather than a join it could forget to scope.

`ProviderCustomer` belongs to exactly one clinic. The same person booking at two clinics
produces two records that both link to one platform `User` — so each clinic keeps its own
notes and contact details without either seeing the other's.

See [authorization.md](authorization.md).

## Trade-offs taken

**Availability is computed on read, not materialised.** A materialised slot table would
make reads cheaper but introduces a cache to invalidate on every schedule edit, staff
change, resource change and booking. Computing from source means availability cannot
drift. The cost is bounded: one day's slots for one treatment is a handful of indexed
queries plus in-memory interval arithmetic.

**Holds expire lazily, not on a timer.** `expireStaleHolds()` runs at the start of every
availability read and inside the booking transaction. A background worker would also
work, but lazy expiry keeps the guarantee true even when no worker is running — and the
database constraint, not the sweep, is what prevents double booking either way.

**Removal means deactivation.** Suspending or deactivating a clinic changes its status
and takes it off the marketplace. Bookings, payments and reviews are financial and
clinical history that patients and administrators rely on; they are never deleted. Where
a clinic deletes its own treatment or practitioner, the record is archived instead if it
has any appointment history.

**Money is integer satang.** No currency value is ever a float.

**Sessions re-read the user on every request.** The cookie carries an identity claim only;
role, tenant and account status come from the database each time. That costs one indexed
query per request and means a suspension takes effect immediately rather than when the
cookie expires.

## Design system

Tokens live in `src/app/globals.css` under Tailwind v4's `@theme`. Deep navy for
structure and headings, a restrained teal reserved for actions, links and verification,
warm white ground, white surfaces, thin borders, and shadows that stay close to the
surface. Status colours are muted and used only to carry status.

Motion has four movements — pages settle, lists reveal, overlays fade with a hint of
scale, booking steps slide along the direction of travel — between 160 and 280 ms, and
every one collapses under `prefers-reduced-motion`.

## Extending it

**A real payment gateway.** Implement `PaymentGateway` (`src/lib/payments/gateway.ts`) and
register it in `registry.ts`. Nothing else changes: the booking flow, the webhook handler
and the state machine depend on the interface only.

**Real LINE.** Implement `LineLoginAdapter` and `LineMessagingAdapter`
(`src/lib/line/index.ts`) and return them from the factories. The button, the callback
route and the resulting session are already identical in both cases.

**Real notification delivery.** Implement `NotificationTransport`
(`src/lib/notifications/transport.ts`). Composition and delivery are already separate, and
every message is persisted before it is handed over.

**Clinic staff logins.** `CLINIC_STAFF` exists throughout the guards and the schema.
`requireClinicAdmin()` already separates owner-only actions from ones any member can take.

**A fourth language.** Add a dictionary under `src/lib/i18n/dictionaries` typed as
`Dictionary`, and add the locale to `LOCALES`. The type will list anything missing.
