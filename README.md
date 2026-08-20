# 46-Client-and-PRM-Team-B

> Next.js + Firebase monorepo.

## Stack

| | |
|-|-|
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind v4 |
| **Backend** | Firebase Cloud Functions v2 · Express (single "fat lambda") |
| **Database / Auth** | Firestore · Firebase Authentication |
| **Testing** | Vitest · Testing Library · supertest |

## Getting Started

Everything runs locally against the team's real (free-tier) Firebase project — there is no Docker and no local emulator to set up.

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 22+** | `node --version` |
| **pnpm 10+** | Never use `npm` or `yarn` in this repo — see below |
| **Firebase project access** | Ask the team lead to add your Google account to the team Firebase project (Auth + Firestore enabled) |
| **Git** | Configured with your GitHub account |

Installing pnpm — either works:

```bash
corepack enable pnpm      # ships with Node; needs an Administrator terminal on Windows
npm install -g pnpm       # fallback, no elevation needed
```

If neither is available, prefix commands with `corepack pnpm` instead of `pnpm`.

### Setup

```bash
git clone https://github.com/Jason6322/46-Client-and-PRM-Team-B.git
cd 46-Client-and-PRM-Team-B

pnpm install              # installs all workspaces + activates the git hooks

cp .env.example .env      # then fill in the values (see below)
pnpm run dev              # http://localhost:3000
```

### Environment variables

The root **`.env` is the single source of truth**. `pnpm run env:sync` generates `frontend/.env.local` and `backend/.env` from it, and runs automatically before `pnpm run dev` — never edit those two files by hand. `.env` is gitignored; never commit it.

Values come from **Firebase Console → Project settings**:

- `NEXT_PUBLIC_FIREBASE_*` — from *Your apps → firebaseConfig*. Safe for the browser.
- `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` — from *Service accounts → Generate new private key*, base64-encoded. **Server-only secret** — never prefix it with `NEXT_PUBLIC_`.

`.firebaserc` must be set to the same project ID as `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Full reference: [docs/ENV-VARS.md](docs/ENV-VARS.md).

Ask the team for the `NEXT_PUBLIC_FIREBASE_*` values — they're safe to share, since they ship to the browser by design. Generate your own `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` from the Firebase Console rather than passing the key around; it's a private key with full admin access:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\service-account.json')) | Set-Clipboard
```

### Commands

| Command | What it does |
|---------|--------------|
| `pnpm run dev` | Frontend dev server on :3000 |
| `pnpm run build` | Production build (frontend + backend) |
| `pnpm run test` | Backend unit tests (mocked Firebase Admin) |
| `pnpm run test:component` | Frontend unit tests |
| `pnpm run test:all` | Both suites |
| `pnpm run lint` | ESLint across all packages |
| `pnpm run typecheck` | TypeScript check across all packages |
| `pnpm run validate` | Check for unreplaced template placeholders |

### Contributing workflow

1. Branch from `main` — `feature/*` for new work, `hotfix/*` for urgent fixes. Never commit to `main` directly.
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`). The `commit-msg` hook rejects anything else, and a `pre-commit` hook runs lint + format.
3. Open a PR into `main` and fill in the PR template.
4. CI must be green before merge — lint + typecheck, frontend tests, backend tests, and a dependency vulnerability audit all run on every PR.

More detail in [docs/GIT-WORKFLOW.md](docs/GIT-WORKFLOW.md) and [docs/CI-CD.md](docs/CI-CD.md). New to the codebase? Start with [docs/GUIDE.md](docs/GUIDE.md).

## Project Structure

```
/
├── frontend/          Next.js 16 App Router
│   └── src/
│       ├── app/       Pages (route groups: (auth), (dashboard))
│       ├── components/ UI components (layout, shared)
│       ├── features/  Feature modules (one folder per business domain)
│       ├── lib/       Firebase client/admin (lazy init), validations, utils
│       ├── hooks/     Custom React hooks
│       ├── providers/ React context providers
│       ├── actions/   Next.js Server Actions
│       └── types/     TypeScript type definitions
├── backend/           Cloud Functions v2 — Express fat-lambda
│   └── src/
│       ├── app.ts     Express app factory
│       ├── routes/    One file per resource
│       ├── middleware/ auth (ID token → req.user), errorHandler (RFC 9457)
│       └── lib/       firebase (Admin singleton), errors (HttpError), zodConverter
├── firebase/          Firestore rules, indexes
└── docs/              Reference docs
```

## Security

Security is enforced in independent layers — HTTP hardening (helmet/CORS/rate limits), token + session-cookie auth, Zod input validation, default-deny Firestore rules, and CI scanning. See [docs/SECURITY.md](docs/SECURITY.md).

## Deployment

The frontend deploys to **Vercel** (server-rendered, requires a server host, not static hosting).
