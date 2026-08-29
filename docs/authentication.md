# Authentication

## Sessions

A signed JWT in an httpOnly cookie.

```
POST /api/auth/login
  → verify email + password (bcrypt)
  → reject unless status = ACTIVE
  → sign a JWT carrying only the user id
  → set httpOnly cookie
  → return the destination for that account's role
```

The cookie (`suay_session`) is `httpOnly`, `sameSite: lax`, `secure` in production, path
`/`, and lives for `AUTH_SESSION_TTL_SECONDS` (7 days by default). It is signed with
HS256 using `AUTH_SECRET`, which must be at least 32 characters — the code refuses to
start otherwise rather than signing with something guessable.

### The claim is deliberately thin

The token carries a user id and a version. It does **not** carry the role or the tenant.
`getSession()` re-reads the user — and their clinic's status — from the database on every
request.

That costs one indexed query per request and buys the property that matters: a suspended
account, a revoked clinic membership, a changed role or a suspended clinic takes effect
**on the next request**, not whenever the cookie happens to expire. A session that carried
its own role would keep working for up to a week after being revoked.

`SESSION_VERSION` allows invalidating every session at once if the shape ever changes.

## Passwords

- bcrypt, cost 10.
- Minimum 8 characters, at least one letter and one number, checked on the server.
- The sign-in response is identical for an unknown email and a wrong password, so the
  endpoint cannot be used to discover which addresses have accounts.
- No password is ever logged, returned or included in an audit entry.

## Sign-in surfaces

Three pages — `/login`, `/clinic/login`, `/admin/login` — differ only in framing. They all
post to the same endpoint, and **the server decides where the account belongs**. Signing
in on the admin page with a patient account produces a patient session and lands on the
patient area. The page is a doorway, not a permission.

`?next=` is honoured only for same-origin paths beginning with a single `/`, so it cannot
be used to bounce someone to another site after signing in.

## Registration

`POST /api/auth/register` always creates a `CUSTOMER`. `POST /api/clinic/register`
always creates a `CLINIC_ADMIN` plus a `DRAFT` provider. Neither reads a role from the
request; there is no path by which a self-registration produces elevated access. Platform
administrators are created by seeding or directly in the database.

## LINE Login

LINE is the natural identity provider for a Thai consumer product, but requiring channel
credentials to run the project locally would be a poor trade. The integration is behind an
interface:

```ts
interface LineLoginAdapter {
  authorizationUrl(state, redirectUri): string;
  exchange(code): Promise<LineProfile>;
}
```

In development, `authorizationUrl` points at `/auth/line/mock` — a local screen that
stands in for LINE's consent page and clearly says so — and `exchange` decodes the demo
identity it returns. The callback route, the account linking and the resulting session are
**identical** in both cases, so switching to real credentials changes one factory and
nothing else.

Two safeguards in the callback:

- LINE can only ever produce or link to a `CUSTOMER` account. A LINE identity cannot
  attach itself to a clinic or admin login even if the email matches.
- An inactive account is redirected to sign-in rather than given a session.

## Logout

`POST /api/auth/logout` deletes the cookie. There is no server-side session store to
clean up, which is the trade-off of stateless sessions; revocation is handled by the
status re-read described above.

## What is not built

Password reset, email verification and multi-factor authentication are out of scope for
this build. `User.emailVerified` exists in the schema and the auth layer is structured to
accept them: a reset would be a token table plus two routes, and it would not touch the
session or guard code.

## Environment

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | HS256 signing key, ≥32 characters. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `AUTH_SESSION_TTL_SECONDS` | Cookie lifetime, default 604800 (7 days) |
| `LINE_LOGIN_MODE` | `mock` (default) or `live` |
| `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_LIFF_ID` | Only needed for a live LINE integration |

No secret is ever exposed to the browser. The only `NEXT_PUBLIC_` variable in the project
is `NEXT_PUBLIC_DEMO_MODE`.
