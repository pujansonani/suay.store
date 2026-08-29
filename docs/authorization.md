# Authorization

Hiding a button is a courtesy. The guards are the boundary.

## Roles

| Role | Scope |
|---|---|
| `CUSTOMER` | Own bookings, own profile, public marketplace |
| `CLINIC_ADMIN` | One clinic, in full |
| `CLINIC_STAFF` | One clinic, minus owner-only actions |
| `PLATFORM_ADMIN` | Platform-wide |

## The one rule

**Identity and tenant come from the session. Never from the request.**

Nothing in this codebase reads a user id, a role or a provider id from a request body, a
query string or a header. Those are attacker-controlled. Every handler starts with a
guard, and the guard reads the session cookie and re-reads the user row.

```ts
// How every clinic endpoint begins
const { providerId, user } = await requireClinicMember();

// …and every clinic query is scoped by it
const services = await prisma.service.findMany({ where: { providerId } });
```

If `providerId` were accepted from the client, changing one value in a request body would
hand over another clinic's diary.

## Guards

`src/lib/auth/guards.ts` — for API routes; they throw, and `handler()` turns the error
into the right HTTP status.

| Guard | Refuses |
|---|---|
| `requireUser()` | Anonymous → 401 |
| `requireRole(...roles)` | Wrong role → 403 |
| `requireCustomer()` | Anything but a customer → 403 |
| `requireAdmin()` | Anything but a platform admin → 403 |
| `requireClinicMember(opts)` | Non-clinic role, no clinic, suspended, deactivated, or unapproved unless `allowUnapproved` |
| `requireClinicAdmin(opts)` | As above, plus clinic staff → 403 |
| `assertOwnedByProvider(row, id)` | A row belonging to another clinic → 403 |

`src/lib/auth/routes.ts` — for pages; they redirect rather than throw, because a browser
navigation should land somewhere useful. `requireCustomerPage`, `requireClinicPage`,
`requireClinicOnboardingPage`, `requireAdminPage`.

The two sets are independent. A page guard redirecting is a convenience; the API guard
refusing is the protection.

### `allowUnapproved`

A clinic must be able to enter its treatments, practitioners, rooms and opening hours
*before* it is approved — that is what the registration flow asks it to do. The setup
endpoints (services, staff, resources, schedule) pass `allowUnapproved: true`.

Suspended and deactivated clinics are still refused, and the endpoints that would let an
unapproved clinic behave as an approved one — publishing, taking bookings — do not pass
the flag.

## Two ways ownership is enforced

**Scope the query.** Preferred, because a wrong id then returns nothing rather than
someone else's row:

```ts
const booking = await prisma.booking.findFirst({ where: { id, providerId } });
```

**Pass the scope into the service.** Where the check must happen inside the transaction
that mutates:

```ts
await cancelBooking({ bookingId: id, providerId, actorId: user.id, actorRole: "PROVIDER" });
// cancelBooking re-reads the row and compares providerId before writing.
```

`findUnique({ where: { id } })` followed by a check is the pattern to avoid; it is one
forgotten `if` away from a leak.

## Not found and forbidden say the same thing

`assertOwnedByProvider` returns an identical message for a record that does not exist and
one that belongs to someone else. Otherwise the difference between the two responses tells
an attacker which ids are real.

## What each role cannot do

**A clinic cannot:**

- read or modify another clinic's bookings, customers, practitioners, treatments, rooms,
  equipment, payments or reviews;
- approve or verify itself — `status`, `verificationStatus` and `Staff.verified` are
  absent from every clinic-writable payload;
- publish before an administrator has approved it;
- reach `/admin` or any `/api/admin/*` route.

**A patient cannot:**

- read or act on another patient's bookings — every query filters on `customerId` from the
  session;
- reach the clinic portal or administration;
- review an appointment that was not theirs and was not completed.

**An administrator cannot:**

- suspend their own account (the API refuses it, so nobody locks themselves out);
- act without it being recorded — every consequential action writes an `AuditLog` row with
  actor, action, entity, timestamp, metadata and IP.

## Marketplace visibility

One constant decides what the public can see:

```ts
export const PUBLIC_PROVIDER = { status: "APPROVED", published: true };
```

Every public query starts from it, so pending, rejected, suspended and deactivated clinics
cannot appear in search, on a profile page, in a treatment listing, or through the public
availability endpoint. Approval is the administrator's decision; publication is the
clinic's; both must be true.

## Sessions and revocation

The cookie carries an identity claim and nothing else. Role, tenant and account status are
re-read from the database on every request, so suspending an account or a clinic takes
effect on their next request rather than when a token expires. See
[authentication.md](authentication.md).

## Tested, not asserted

`src/tests/authorization.test.ts` covers the guards directly: anonymous callers, a
customer reaching for the clinic portal and for administration, a clinic user reaching for
administration, clinic staff attempting owner-only actions, clinics that are suspended,
deactivated or not yet approved, the identical not-found/forbidden messages, and that a
provider-scoped query cannot return another clinic's rows.

`src/tests/provider-workflow.test.ts` covers isolation through the services: one clinic
cancelling another's booking, one clinic completing another's appointment, one patient
cancelling another's booking, and that the same person booking at two clinics produces two
separate `ProviderCustomer` records.

The API surface was additionally exercised against a running server: Clinic B attempting
to PATCH and DELETE Clinic A's bookings, services, practitioners and resources by id
(403 in every case, with the target row verified unchanged); a customer reaching for
clinic and admin endpoints (403); a clinic reaching for admin endpoints (403); anonymous
callers (401); and a customer reading and cancelling another customer's booking (404 and
403).
