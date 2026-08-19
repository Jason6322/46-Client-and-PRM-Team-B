# 46-Client-and-PRM-Team-B

> Next.js + Firebase monorepo.

## Stack

| | |
|-|-|
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind v4 |
| **Backend** | Firebase Cloud Functions v2 · Express (single "fat lambda") |
| **Database / Auth** | Firestore · Firebase Authentication |
| **Testing** | Vitest · Testing Library · supertest |

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
