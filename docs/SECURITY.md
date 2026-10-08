# Security

## Overview

Security is enforced in layers — each layer is independent so a failure in one does not collapse the others.

| Layer        | Mechanism                                                 |
| ------------ | --------------------------------------------------------- |
| Claude Code  | Deny rules, PreToolUse/PostToolUse hooks                  |
| HTTP         | Security headers in `next.config.ts`                      |
| Auth         | Firebase token verification, session cookies              |
| API          | Zod input validation, per-user access control             |
| Data         | Firestore security rules (default deny, field allowlists) |
| CI           | `pnpm audit --audit-level=high` on every PR               |
| Dependencies | Dependabot weekly PRs for npm packages and Actions        |

There's no automated secret scanner in this boilerplate. Never commit `.env`, service account JSON, or any real API key — `.env` is gitignored and `.env.example` ships with empty values for exactly this reason.

---

## HTTP Security

Security headers are set in `next.config.ts` for all routes:

| Header                   | Value                                                         |
| ------------------------ | ------------------------------------------------------------- |
| `X-Content-Type-Options` | `nosniff`                                                     |
| `X-Frame-Options`        | `DENY`                                                        |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`                             |
| `Permissions-Policy`     | camera, microphone, geolocation, browsing-topics all disabled |

There is no CORS configuration: Route Handlers are same-origin with the UI, and Next.js sends no `Access-Control-Allow-Origin` header, so browsers block cross-origin reads by default. There is also no built-in rate limiting — if an endpoint needs it, use the Vercel Firewall (project → Firewall) or add a limiter inside the handler.

**Content Security Policy (CSP)** is an opt-in per project — it requires nonce injection in `proxy.ts` and a tuned `script-src` for each project's third-party scripts. See Next.js CSP docs when adding it to a client project.

---

## Authentication

### Route Handler token flow

```
Client → Authorization: Bearer <Firebase ID token>
         ↓
verifyBearer(req) → adminAuth.verifyIdToken() → BearerUser { uid, email } | null
         ↓
Route Handler → null? return unauthorized() : use user.uid
```

- Tokens expire after 1 hour — the client SDK auto-refreshes via `getIdToken()`
- In tests, mock `@/lib/api/bearer` rather than touching Firebase
- Invalid or expired tokens always return `401 Unauthorized` with RFC 9457 format

### Frontend session flow

```
Sign in → Firebase ID token → POST /api/auth/session
                               ↓
                     adminAuth.createSessionCookie()
                               ↓
                     HttpOnly __session cookie (14 days)
                               ↓
proxy.ts: optimistic presence check → gates protected routes
Server Actions: requireAuth() → adminAuth.verifySessionCookie(cookie, true)
```

- `requireAuth()` checks token revocation (`checkRevoked: true`) on every Server Action call
- The `proxy.ts` cookie check is **optimistic** (presence only) — real cryptographic verification always happens in Server Actions near the data
- Session cookies are `HttpOnly`, `Secure` (production), `SameSite=Strict`

### Revoking sessions

To force-sign-out a user:

1. `adminAuth.revokeRefreshTokens(uid)` — revokes all tokens
2. Delete the Firestore `users/{uid}` session record if used
3. Subsequent `verifySessionCookie(cookie, true)` calls will return 401

---

## Input Validation

Every Server Action and Route Handler validates its input with Zod before use. Use `.strict()` to reject unknown fields (prevents mass assignment):

```typescript
const schema = z
  .object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
  })
  .strict(); // rejects any fields not listed above

const parsed = schema.safeParse(await req.json());
if (!parsed.success) {
  return problem(
    400,
    "Bad Request",
    parsed.error.issues[0]?.message ?? "Invalid input",
  );
}
// use parsed.data — fully typed, no unknown fields
```

Never use request or form data without a preceding Zod parse.

---

## Error Handling

Errors use RFC 9457 Problem Details format — no stack traces, no internal details leak to the client:

```json
{
  "type": "https://httpstatuses.io/404",
  "title": "Not Found",
  "status": 404,
  "detail": "User 'abc' not found"
}
```

- Route Handlers return errors only via `problem()` / `unauthorized()` (`frontend/src/lib/api/problem.ts`)
- Server Actions return `{ success: false, error }` with a safe message
- Unknown errors log server-side and return a generic message — never expose stack traces
- Use `console.error` (not `console.log`) for error logging

---

## Firestore Security Rules

Rules in `firebase/firestore.rules` are the **last line of defence**. Write rules assuming the client is untrusted and malicious.

### Key principles

- **Default deny** — the catch-all `match /{document=**}` block denies everything not explicitly allowed
- **Owner-only** — users can only access their own documents via `isOwner(uid)`
- **Field allowlists** — `request.resource.data.keys().hasOnly([...])` prevents writing unexpected fields (mass assignment)
- **Immutable fields** — `uid` and `role` cannot be changed by the user after creation
- **Soft-delete only** — `delete: if false` on all user-owned collections; set `deletedAt` field instead
- **notDeleted() guard** — include `&& notDeleted()` in read rules to filter logically deleted docs

### Helper functions

```javascript
isAuthenticated(); // request.auth != null && uid != null
isOwner(uid); // isAuthenticated() && request.auth.uid == uid
isAdmin(); // reads users/{uid}.role == 'admin' (one Firestore read)
hasCustomClaim(claim); // request.auth.token[claim] == true (no Firestore read — use for performance)
notDeleted(); // deletedAt field is null or absent
```

Use `hasCustomClaim('admin')` in high-read collections to avoid the Firestore read that `isAdmin()` triggers. Set custom claims via Admin SDK:

```typescript
await adminAuth.setCustomUserClaims(uid, { admin: true });
```

### Deploying rules

```bash
npx firebase-tools deploy --only firestore:rules
```

Never deploy rules from a local machine in production — use the CI deploy workflow.

---

## Firebase Service Account

`FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` is a base64-encoded service account JSON.

**Rules:**

- Never commit this value to version control
- Never use a `NEXT_PUBLIC_` prefix (exposes it to the browser)
- Store in Vercel environment variables for production
- Store as a GitHub Actions secret for CI/CD
- Rotate immediately if accidentally exposed: Firebase Console → Project Settings → Service Accounts → Revoke key

---

## Environment Variables

| Classification            | Rule                                                           |
| ------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_*`           | Safe for the browser — Firebase client config only             |
| Server secrets            | Never use `NEXT_PUBLIC_` prefix — enforced by Claude Code hook |
| `.env.local` / `.env`     | Gitignored — never commit                                      |
| `.env.example`            | Committed with empty values — safe                             |
| `*.pem`, `*.p12`, `*.key` | Blocked from Claude Code reads via `permissions.deny`          |

---

## Dependency Scanning

`pnpm audit --audit-level=high` runs on every PR in CI (`security` job in `ci.yml`). The job fails on any high or critical CVE, blocking the merge.

```bash
# Run locally
pnpm audit --audit-level=high

# Auto-fix where safe
pnpm audit --fix
```

Dependabot opens weekly PRs for outdated npm packages (scanned from the workspace root so `pnpm-lock.yaml` is updated too; major versions are skipped) and GitHub Actions workflows (`.github/dependabot.yml`).

---

## Claude Code Security Hooks

The `.claude/settings.json` hooks enforce security patterns automatically:

| Hook                         | What it blocks                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `permissions.deny`           | `rm -rf`, force push, `--no-verify`, `npm`/`yarn`, `curl \| bash`, `wget \| bash`, reading `~/.ssh/**`, `~/.aws/**`, `*.pem`, `*.p12`, `*.key` |
| PostToolUse — `any` block    | TypeScript `any` in all forms: `: any`, `as any`, `any[]`, `Promise<any>`, `Record<string, any>`                                               |
| PostToolUse — secret prefix  | `NEXT_PUBLIC_` on service accounts, admin keys, or private keys                                                                                |
| PostToolUse — env files      | Blocks writing `.env.local`, `.env.production`, `.env.staging` (only `.env.example` is safe)                                                   |
| PostToolUse — admin.ts       | Blocks `'use client'` in `lib/firebase/admin.ts`                                                                                               |
| PreToolUse — firebase deploy | Blocks `firebase deploy` — requires explicit user approval                                                                                     |
| PreToolUse — git push        | Blocks direct pushes to `main`                                                                                                                 |

---

## Opt-In Security Hardening (Per Client)

These are not enabled by default because they require per-project configuration:

### Firebase App Check

Prevents non-app clients (curl, scanners) from calling Firebase services. Enforce it per service in Firebase Console → App Check.

Requires App Check initialization in the frontend Firebase SDK. Document the setup steps before enabling on a client project.

### Content Security Policy

Blocks XSS by restricting which scripts can execute. Requires nonce injection in `proxy.ts` — see the Next.js CSP guide. The `script-src` directive must be tuned to each project's third-party scripts (Google Analytics, Intercom, etc.).

### Email Enumeration Protection

Enable in Firebase Auth: Authentication → Settings → Email enumeration protection. Returns generic errors for sign-in attempts on non-existent accounts (prevents user discovery).

### Firestore Field-Level Validation

Add `request.resource.data.size() == N` and field-type checks on write rules for collections that store sensitive data:

```javascript
allow create: if request.resource.data.keys().hasOnly(['title', 'uid', '_schemaVersion'])
  && request.resource.data.title is string
  && request.resource.data.title.size() <= 200;
```
