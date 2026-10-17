---
description: Full local bootstrap — from fresh clone to the app running against a real Firebase project. Checks prerequisites, installs dependencies, walks through creating a free Firebase project and filling the root .env, starts the dev server, and smoke-tests the auth round trip. Use on first setup or whenever local dev is broken.
---

# Skill: /bootstrap

Take the repo from fresh clone to a **running app against a real Firebase project**, end to end, verifying every step. Do not stop at the first success message — the job is done only when the smoke test in Step 5 passes.

There is no local emulator in this project — the app always talks to the real Firebase project configured in `.env`. Firebase's free Spark plan covers Authentication and Firestore, so no billing is required.

## Step 1 — Preflight

```bash
node --version   # need >= 22
pnpm --version    # need >= 10
```

If either is missing or too old, stop and tell the user what to install.

## Step 2 — Install dependencies

```bash
pnpm install
```

| If you see                                          | Fix                                                                                                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_PNPM_IGNORED_BUILDS` / "Ignored build scripts" | `pnpm-workspace.yaml` must contain an `allowBuilds:` map with `'@firebase/util'`, `esbuild`, `lefthook`, `protobufjs`, `sharp`, `unrs-resolver` all set to `true`. Fix it, re-run `pnpm install`. |
| `'next' is not recognized` later                    | Re-run `pnpm install` from the **repo root**.                                                                                                                                                     |

Confirm Lefthook hooks installed (install output shows `sync hooks: ✔️`).

## Step 3 — The one env file

All configuration lives in the **root `.env`** (never edit `frontend/.env.local` — it is generated).

1. If `.env` does not exist: `cp .env.example .env`
2. Ask the user if they already have a Firebase project for this repo. If not, walk them through:
   - Create a project at https://console.firebase.google.com (free Spark plan — no billing needed)
   - Build → Authentication → get started → enable a sign-in method (Email/Password is simplest)
   - Build → Firestore Database → create database (start in production mode; rules already live in `firebase/firestore.rules`)
3. Fill `.env` from the Firebase console:
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` — Project settings → General → Project ID
   - `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` — Project settings → Service accounts → Generate new private key, then base64-encode the downloaded JSON (macOS: `base64 -i service-account.json | tr -d '\n'` — BSD `base64` has no `-w` flag; Linux: `base64 -w 0 service-account.json`)
   - `NEXT_PUBLIC_FIREBASE_*` — Project settings → Your apps → add/open a web app → copy the `firebaseConfig` values
   - `NEXT_PUBLIC_APP_NAME`
4. `.firebaserc` → `projects.default` must equal `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
5. `pnpm run env:sync`

Verify: `frontend/.env.local` exists and contains the values from `.env` (`NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64`, etc).

## Step 4 — Start the app

```bash
pnpm run dev
```

Run in the background, then wait for `http://localhost:3000` → 200 (first compile can take ~30 s).

## Step 5 — Smoke test (mandatory — this defines "done")

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000                 # 200
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/auth/signin    # 200
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/dashboard      # 307 (redirect to signin)
```

Then check the server can verify Firebase tokens. Access is invite-only, so a throwaway sign-up would just be refused — an invalid token is enough to exercise the Admin SDK:

```bash
curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/session \
  -H 'Content-Type: application/json' -d '{"token":"not-a-real-token"}'   # 401
```

401 means Firebase Auth looked at the token and rejected it, so the service account works. 503 means the server couldn't reach Firebase — check the dev server log; a `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` error means it's empty or malformed in `.env` (re-run `pnpm run env:sync` and restart dev).

Finally, the full round trip with the first admin. Ask the user for their email, then:

```bash
pnpm --filter frontend make-admin -- <their email>
```

It creates the account if needed. The user sets a password with **Forgot password?** on the sign-in page and signs in; they should land on `/dashboard` with an **Admin** link in the top nav (sign-in → session cookie → profile gate → protected page). If Email/Password sign-in fails outright, it is likely not enabled in the Firebase console (Authentication → Sign-in method). If sign-in says the account doesn't have access, the profile wasn't written — re-run `make-admin`.

## Step 6 — Report

Output a summary the user can act on:

```
## Bootstrap complete ✅

Firebase project: <NEXT_PUBLIC_FIREBASE_PROJECT_ID>
App:              http://localhost:3000
Admin:            <their email> (password set with Forgot password?)

| Check | Result |
|-------|--------|
| Dependencies + git hooks | ✅ |
| .env → generated env files | ✅ |
| App pages (/, /auth/signin, /dashboard gate) | ✅ |
| Token verification (/api/auth/session → 401) | ✅ |
| Admin sign-in → /dashboard | ✅ |

Next: invite teammates from /admin, then read docs/GUIDE.md §4 to build your first feature.
```

If ANY check failed, the verdict is **NOT BOOTSTRAPPED** — show which step, the error, and the fix from the tables above. Never report success with a failing smoke test.
