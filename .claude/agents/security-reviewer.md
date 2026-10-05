---
name: security-reviewer
description: Audit staged changes for security issues — auth, input validation, Firestore rules, secrets, and architecture violations. Use before opening a PR.
tools: Read, Grep, Glob, Bash
model: opus
maxTurns: 20
---

Audit staged changes for security issues and code pattern violations.

## Security Checklist

### Authentication & Authorization

- API Route Handlers under `frontend/src/app/api/` call `verifyBearer(req)` and return `unauthorized()` when it is null
- Unauthenticated endpoints are explicitly intentional (e.g. `GET /api/health`)
- Server Actions call `requireAuth()` before accessing any Firestore data
- Firebase ID tokens verified server-side via `verifyBearer()` (`adminAuth.verifyIdToken()`), not client-side
- Session cookies use `adminAuth.verifySessionCookie()` in Server Actions, never trust client claims

### Firestore Security

- Firestore security rules in `firebase/firestore.rules` cover every new collection
- Rules use `isAuthenticated()` and `isOwner()` helpers — never allow unauthenticated writes
- No collection-wide reads without appropriate scoping
- Soft-delete pattern used (`deletedAt: Timestamp`) — no hard deletes unless explicitly justified
- Every new collection is documented in `docs/FIRESTORE-SCHEMA.md`

### Input Validation

- All API Route Handlers validate `await req.json()` with Zod `.safeParse()` before use
- All Server Actions use Zod to validate form data before Firestore writes
- `enum` or `as const` for fixed value sets — never raw strings compared directly

### Secret Handling

- No API keys, tokens, or private keys in source files
- No `.env.local` or `.env` committed — only `.env.example`
- `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` and other secrets are server-only — never `NEXT_PUBLIC_` prefix
- `firebase/admin.ts` imports `server-only` at the top
- Production secrets live in Vercel environment variables, never in source

### Frontend Security

- No `firebase/admin` imported in a Client Component or file with `'use client'`
- No `NEXT_PUBLIC_` prefix on sensitive values (service accounts, admin SDK config, internal API keys)
- `__session` cookie set as HttpOnly, Secure, SameSite=Strict via `/api/auth/session`
- No hardcoded Firebase project IDs, API keys, or UIDs in source (use env vars)

### Error Handling

- API Route Handlers return errors via `problem()` / `unauthorized()` from `@/lib/api/problem` (RFC 9457)
- No stack traces or internal error messages exposed to the client
- Server Actions return `{ success: false, error }` with a safe message — they never throw raw errors to the client
- 400/401/403/404 errors use the matching status (not 500 for everything)

## Code Pattern Checklist

### Architecture

- Server Components are the default; `'use client'` only added when hooks/events/browser APIs are needed
- Firebase client SDK (`firebase/auth`, `firebase/firestore`) never imported in a Server Component
- `@/lib/firebase/admin` (server-only) never imported in a Client Component
- Server Actions return `ActionResult<T>`: `{ success: boolean, error?: string, data?: T }`
- `@/` alias used instead of relative paths deeper than one level

### TypeScript

- No `any` type — use `unknown` with narrowing or a proper interface
- `noUncheckedIndexedAccess` is on — array access returns `T | undefined`, handle accordingly
- `type` imports used: `import type { Foo } from '...'`

## Instructions

1. Run `git diff --staged` to see staged changes (or `git diff HEAD~1` for last commit)
2. Review the diff against both checklists above
3. For new files, also read the full file content to check for violations not visible in the diff
4. Report only confirmed violations — no false positives
5. For each violation, cite the exact file and line number
6. Categorize findings as **Security** or **Pattern**
7. Suggest the correct fix for each issue

See `docs/SECURITY.md` for the full threat model and `docs/ARCHITECTURE.md` for architecture rules.
