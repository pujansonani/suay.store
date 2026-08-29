# Working on Suay.store

Read this before changing anything. `docs/` has the detail; this is what will
bite you.

## Setup

```bash
npm install
cp .env.example .env      # set AUTH_SECRET (≥32 chars) and DATABASE_URL
npm run setup             # migrate + generate + seed
npm run dev
```

Demo accounts (password `Demo1234`): `customer@`, `clinic@`, `clinic-b@`,
`admin@demo.suay.store`.

## Commands

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Vitest against `TEST_DATABASE_URL` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Re-seed the demo data |

Tests need a **real** PostgreSQL database:

```bash
createdb suay_test
DATABASE_URL="postgresql://…/suay_test" npx prisma migrate deploy
```

## Rules that are not negotiable

**Identity comes from the session, never from the request.** Every API handler
starts with a guard from `src/lib/auth/guards.ts`. Nothing reads a user id, a
role or a `providerId` from a body, query string or header.

```ts
const { providerId, user } = await requireClinicMember();
const rows = await prisma.service.findMany({ where: { providerId } });
```

**Scope the query, don't check afterwards.** `findFirst({ where: { id, providerId } })`
returns nothing for another clinic's row. `findUnique({ where: { id } })` followed
by an `if` is one forgotten line away from a leak.

**Never bypass the exclusion constraints.** Double booking is prevented by
PostgreSQL, not by application code. If you write to `BookingStaffAssignment` or
`BookingResourceAssignment`, go through `createBooking` / `rescheduleBooking` and
let `23P01` surface as `SlotUnavailableError`. Use `prisma migrate`, never
`prisma db push` — `db push` skips the hand-written constraint migration and
silently removes the guarantee.

**Money is integer minor units (satang).** Never a float. Format with
`src/lib/money.ts`.

**Time is `timestamptz`.** Schedules are minutes from local midnight in the
clinic's timezone. Convert with `src/lib/time.ts`; do not hand-roll offsets.

**Archive, don't delete.** Anything with history is deactivated. Cancelling sets
`active = false` on assignment rows, which releases capacity without losing the
record.

**Only `PUBLIC_PROVIDER` decides public visibility.** Every public query starts
from that constant in `src/lib/data/marketplace.ts`.

**Don't fabricate trust.** `VerifiedBadge` takes a status, not a boolean.
`Staff.verified` is settable only by a platform admin. Demo credentials are
labelled as fictional, and no copy promises outcomes.

## Layout

```
src/app/(marketing)  public marketplace + /account
src/app/clinic       registration, onboarding, status, and (portal) for approved clinics
src/app/admin        (panel) for platform administrators
src/app/api          route handlers — guard, validate, call a service
src/lib/auth         sessions and guards
src/lib/booking      availability, holds, concurrency
src/lib/payments     gateway interface, mock, webhooks
src/lib/data         reads, grouped by audience
src/tests            Vitest suites
```

## Conventions

- Validate every request body with a Zod schema from `src/lib/validation.ts`.
- Wrap handlers in `handler()` from `src/lib/api.ts` so thrown `AppError`s become
  the right status.
- Write an `AuditLog` row for anything consequential — approvals, suspensions,
  edits on someone's behalf, payment state changes.
- Forms use `Field` from `src/components/ui/field.tsx`: real labels, never a
  placeholder as a label.
- Status renders as a labelled pill, never colour alone.
- Motion comes from `src/components/ui/motion.tsx` and respects
  `prefers-reduced-motion`. Keep it between 160–280ms.
- Wide tables go in `TableWrap` so the page never scrolls sideways. Cards and
  grid items need `min-w-0` or they refuse to shrink on a phone.
- User-facing strings belong in `src/lib/i18n/dictionaries/`. English is the
  source of truth; the other two are typed against it.

## Before you commit

```bash
npm run typecheck && npm test && npm run build
```
