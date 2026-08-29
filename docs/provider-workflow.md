# Provider workflow

How a clinic gets onto the marketplace, and how it can be taken off again without
destroying anything.

## Lifecycle

```
                    ┌──────────────────────── reject (with reason) ──┐
                    │                                                 ▼
  register ──► DRAFT ──submit──► PENDING_REVIEW ──approve──► APPROVED  REJECTED
                 ▲                     │                        │  │      │
                 │                     └─request changes─┐      │  │      │
                 └──────── resubmit ── CHANGES_REQUESTED ┘      │  │      │
                                                                │  │      │
                                        SUSPENDED ◄── suspend ──┘  │      │
                                            │                      │      │
                                            └── reinstate ─────────┘      │
                                                                          │
                                      DEACTIVATED ◄── deactivate ◄────────┘
```

`published` is a **separate** boolean. Approval is the administrator's decision;
publication is the clinic's. A clinic appears publicly only when
`status = APPROVED AND published = true`.

## Registration

Nine steps, each saving through the same API the portal uses, so a clinic can stop at any
point and come back.

| Step | What it collects |
|---|---|
| 1 | Clinic account — name, contact, email, phone, password |
| 2 | Business information — legal name, address |
| 3 | Clinic details — speciality, description, policies |
| 4 | Treatments — name, duration, price |
| 5 | Practitioners — name, role, treatments they perform |
| 6 | Rooms and equipment |
| 7 | Working hours — weekly, split shifts supported |
| 8 | Verification — registration number, licence references, person responsible |
| 9 | Review and submit |

Step 1 creates a `DRAFT` provider and a `CLINIC_ADMIN` account. The clinic is not listed,
cannot take bookings, and cannot reach the portal.

Steps 2–8 use the ordinary portal endpoints with `allowUnapproved: true` — a clinic must
be able to describe itself before it is approved. See
[authorization.md](authorization.md#allowunapproved).

## Submission

`POST /api/clinic/submit` checks that an administrator will have enough to decide on:

- a description of the clinic
- a contact phone number
- a street address
- at least one treatment
- at least one practitioner
- opening hours
- a business registration number

Anything missing is returned as a list, named in plain language on the review step. On
success the clinic moves to `PENDING_REVIEW`, verification moves to `PENDING`,
`submittedAt` is stamped and an audit entry is written.

**A clinic cannot set its own status to `APPROVED`.** `status`, `verificationStatus` and
`published` are absent from every clinic-writable payload.

## Review

Admin → Verification lists everything awaiting a decision, oldest first. Opening a clinic
shows eight tabs: profile, verification details, practitioners, services, bookings,
payments, reviews and audit history.

| Decision | Requires a reason | Effect |
|---|---|---|
| Approve | no | `APPROVED`, verification approved, clinic may publish |
| Request changes | **yes** | `CHANGES_REQUESTED`, note shown to the clinic |
| Reject | **yes** | `REJECTED`, unpublished, clinic may amend and resubmit |
| Suspend | **yes** | `SUSPENDED`, unpublished, no new bookings |
| Reinstate | no | back to `APPROVED`, publication left to the clinic |
| Deactivate | **yes** | `DEACTIVATED`, archived from the marketplace |

Only transitions valid from the current status are offered, and the service checks them
again server-side. Every decision writes an `AuditLog` row with the administrator,
before/after status, the reason and the count of affected bookings, and notifies the
clinic.

**Approving is not a formality.** It is what puts the verified badge on the public
profile, so the review screen says as much next to the button.

## Suspension and removal

"Remove" means archive, never delete.

**What changes:** status, `published` forced to false, `suspendedAt` and
`suspensionReason` recorded. The clinic disappears from search, its public profile 404s,
its availability endpoint refuses, and `createBooking` rejects new bookings for it. The
clinic's own users are refused the portal and see the status screen with the reason.

**What does not change:** bookings, payments, reviews, practitioners, treatments and
customers are all still there, still readable by administrators, still on the patients'
own appointment lists. This is financial and clinical history that other people rely on.

**Existing appointments are not cancelled.** The decision reports how many upcoming
appointments it did not touch, and the interface says so, so an administrator deals with
them deliberately rather than discovering later that a hundred patients were silently
dropped.

Reinstating restores `APPROVED` but leaves `published` false — coming back onto the
marketplace is the clinic's decision to make again.

## Running the clinic

Once approved, `/clinic/(portal)` covers dashboard, appointments, calendar (day, week,
month, with block-time), treatments, practitioners, rooms and equipment, customers,
payments, reviews, working hours and profile.

Every page and every endpoint is scoped to the `providerId` from the session. Metrics are
clinic-only: the dashboard shows this clinic's appointments, revenue, cancellation rate
and rating, never a platform-wide figure.

**What a clinic controls:** its treatments and prices, its practitioners and what each
performs, its rooms and equipment, its hours and exceptions, its bookings, its policies,
its public profile, and whether it is published.

**What it does not:** its own approval status, its own verification status, whether its
practitioners carry the verified mark, other clinics' anything, and the platform-wide
policy settings.

## Front-desk bookings

Walk-in, phone and LINE bookings go through `createBooking` with a provider channel. They
skip the payment hold and confirm immediately, but consume exactly the same practitioner,
room and equipment capacity through exactly the same exclusion constraints — so a clinic
cannot double-book itself from the front desk either. They are attributed
`PROVIDER_MANUAL`.

## Practitioner verification

`Staff.verified` is settable only by a platform administrator, from the clinic detail
page. A clinic can enter its practitioners' qualifications and registrations, and those
appear on the public profile as clinic-provided information — but the verified mark comes
from a review. That is the whole reason it is worth anything to a patient.

## Reviews

A review requires a `COMPLETED` booking belonging to the reviewer, and there is one per
booking, enforced by a unique key. Clinics may reply publicly; they cannot edit or delete
a rating. Administrators can hold or remove a review, which changes its visibility without
touching its text, so the decision is reversible. The clinic's published rating is
recalculated from visible reviews whenever moderation changes.

## Demonstration data

The seed includes two clinics that exist to show this workflow rather than to be booked:

- **Sindhorn Aesthetic Studio** — `PENDING_REVIEW`, sitting in the verification queue.
- **Riverside Beauty Lounge** — `SUSPENDED`, absent from the marketplace but fully
  inspectable by an administrator, with its suspension in the audit log.
