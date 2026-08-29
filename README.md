# Suay.store

A booking platform for clinics, aesthetic practices and wellness providers in Thailand — a
consumer marketplace on one side, and the software a clinic actually runs its diary on
the other.

**Find a Clinic You Can Trust.**

> **Demonstration deployment.** Every clinic, practitioner, credential and review in the
> seed data is fictional and was written for this demo. Payments run through a simulated
> gateway: no card details are collected and no money moves. Nothing here is medical
> advice or information about a real business.

---

## What it does

Three separate experiences share one database and one set of rules.

**Patients** search verified clinics by treatment and location, compare prices,
durations, practitioners and cancellation policies, see availability generated from the
clinic's real calendar, hold a slot while they pay, and manage, reschedule or cancel
their appointments afterwards.

**Clinics** register, submit business and licence details for verification, and — once
approved — run their day: a calendar across every practitioner, treatments with
durations and turnaround times, practitioners and their shifts, treatment rooms and
equipment as real capacity, walk-in and phone bookings alongside marketplace ones,
payments, reviews and their public profile.

**Platform administrators** review clinic applications, approve, reject or request
changes, suspend or deactivate a clinic without destroying its history, moderate reviews,
inspect every booking and payment, and change commercial policy at runtime. Every
consequential action is written to an append-only audit log.

## Two things worth reading the code for

**Availability is computed, not stored.** A time is offered only when the clinic is open,
a qualified practitioner is on shift, and every room and device the treatment needs has a
free unit — all at once. Buffers are part of occupancy: a 60-minute treatment with a
10-minute turnaround occupies 70 minutes of the calendar but is shown to the patient as
the 60 minutes they attend. See [docs/booking-engine.md](docs/booking-engine.md).

**Double booking is impossible, not merely unlikely.** Availability checks cannot prevent
two concurrent requests from both believing a slot is free. PostgreSQL exclusion
constraints over `(practitioner, time range)` and `(resource, time range)` decide the
race; the loser is told the slot has gone. Intervals are half-open, so 10:00–11:00 and
11:00–12:00 coexist while 10:00–11:00 and 10:30–11:30 cannot. There is a test that runs
both requests concurrently and asserts exactly one wins.

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Database | PostgreSQL 16 via Prisma |
| Styling | Tailwind CSS v4 with a token-based clinical design system |
| Motion | [Motion for React](https://motion.dev) (`motion/react`), respecting `prefers-reduced-motion` |
| Auth | Session JWT in an httpOnly cookie (`jose`), bcrypt password hashing |
| Validation | Zod at every API boundary |
| Tests | Vitest against a real PostgreSQL database |

## Getting started

**Requirements:** Node 20+, PostgreSQL 16+.

```bash
git clone <this repository>
cd suay.store
npm install

cp .env.example .env
# Edit DATABASE_URL and set AUTH_SECRET:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

createdb suay              # or: psql -c 'CREATE DATABASE suay'
npm run setup              # migrate + generate + seed
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts

Seeded for local development only. All use the password **`Demo1234`**.

| Role | Email | Lands on |
|---|---|---|
| Patient | `customer@demo.suay.store` | `/account/appointments` |
| Clinic A | `clinic@demo.suay.store` | `/clinic/dashboard` (Aster Medical Clinic) |
| Clinic B | `clinic-b@demo.suay.store` | `/clinic/dashboard` (Nara Aesthetic Centre) |
| Platform admin | `admin@demo.suay.store` | `/admin` |

Clinic A and Clinic B exist as a pair so that tenant isolation can be demonstrated: sign
in as one and try to reach the other's bookings.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run setup` | Migrate, generate the client and seed |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Re-seed the demonstration data |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Full test suite |
| `npm run typecheck` | TypeScript, no emit |

### Tests

Tests run against a **real PostgreSQL database**, because the guarantee at the centre of
this system is a database constraint — a mocked data layer would test the wrong thing.

```bash
createdb suay_test
DATABASE_URL="postgresql://…/suay_test" npx prisma migrate deploy
npm test
```

`TEST_DATABASE_URL` in `.env` points the suite at that database; it is truncated between
test files and never touches your development data.

## Demonstration walkthroughs

**A clinic joins.** `/for-clinics` → Register → create the account → nine-step onboarding
(business details, clinic details, treatments, practitioners, rooms and equipment,
opening hours, verification, review) → Submit. The clinic is now `PENDING_REVIEW` and is
**not** listed publicly. Sign in as the admin, open Verification, review the submitted
registration details, and approve. Sign back in as the clinic: the portal is now open.
Publish from the clinic profile to appear on the marketplace.

**A patient books.** Find a Clinic → open a clinic → read the practitioners, credentials
and policies → Book a treatment → pick a practitioner, a date and a real free time → sign
in → the slot is held with a visible countdown → pay (card or PromptPay, both simulated)
→ confirmation with a booking reference. The same booking now appears in the clinic's
Appointments and in the admin's Bookings — and **not** in any other clinic's.

**An admin removes a clinic.** Admin → Clinics → open one → Suspend with a reason. It
disappears from public search, its profile 404s, and it can take no new bookings — while
its bookings, payments and reviews remain intact and visible to administrators. The
action is in the audit log with who did it and why. Reinstate reverses it.

**Two patients race for one slot.** Covered by
`src/tests/booking-engine.test.ts` — two concurrent `createBooking` calls for the same
practitioner and time; exactly one succeeds and the other receives
*"This appointment time is no longer available."*

## Documentation

| | |
|---|---|
| [Architecture](docs/architecture.md) | How the pieces fit together, and why |
| [Database](docs/database.md) | Data model, tenancy, constraints and indexes |
| [Authentication](docs/authentication.md) | Sessions, passwords, LINE |
| [Authorization](docs/authorization.md) | Roles, guards, tenant isolation |
| [Booking engine](docs/booking-engine.md) | Availability, holds, concurrency, rescheduling |
| [Payment flow](docs/payment-flow.md) | Gateway abstraction, states, webhooks |
| [Provider workflow](docs/provider-workflow.md) | Registration, verification, suspension |

## Mocked integrations

Everything external is behind an interface with a local implementation, so the project
runs with no third-party credentials at all.

| Integration | Interface | Local behaviour |
|---|---|---|
| Payments | `PaymentGateway` | Simulated card authorisation/capture and a PromptPay QR, with signed webhooks. Omise and 2C2P adapters are stubbed and fail loudly rather than pretending to take money. |
| LINE Login | `LineLoginAdapter` | A local consent screen stands in for LINE's; the resulting session is an ordinary one. |
| LINE Messaging | `LineMessagingAdapter` | Logs the push instead of sending it. |
| Notifications | `NotificationTransport` | Every message is persisted and visible in Admin → Notifications; nothing is delivered. |

## Localisation

English, Thai and Japanese, switchable from the header and persisted in a cookie. English
is the source of truth for the key set — the other dictionaries are typed against it, so a
missing key is a compile error rather than a blank string. Dates and times are always
formatted in the clinic's timezone (`Asia/Bangkok`), because that is the only time that
matters for an appointment. Prices are stored in satang as integers and rendered as ฿.

## Accessibility

Every control has a real label; placeholders are hints, never labels. Status is always a
labelled pill, never colour alone. Focus is visible everywhere, dialogs trap focus and
return it on close, and `prefers-reduced-motion` removes non-essential animation. Tables
scroll inside their own container so the page never scrolls sideways on a phone.

## Deliberate boundaries

- **No clinical records.** Suay stores contact details and appointment history. It is not
  an EMR, and it does not ask for medical history.
- **No real payment credentials.** No card data reaches this application or its database.
- **No fabricated trust.** A verified badge renders only where a platform admin actually
  approved the clinic; practitioner verification cannot be set by the clinic itself.
- **No invented claims.** Seed copy avoids guarantees about outcomes, and medical or
  aesthetic treatments never receive promotional styling.
