# Testing

## Test Layers

| Layer | Command         | Tool                     | Firebase | Description                                              |
| ----- | --------------- | ------------------------ | -------- | -------------------------------------------------------- |
| Unit  | `pnpm run test` | Vitest + Testing Library | Mocked   | Utils, hooks, components, Server Actions, Route Handlers |

There's no local emulator, so there's no integration-test layer against a real Firestore — all tests mock Firebase and never make real network calls.

## Running Tests

```bash
# Run all tests
pnpm run test

# Watch mode
pnpm --filter frontend run test:watch

# Coverage
pnpm --filter frontend run test:coverage
```

## What to Test

### Frontend

- **Always test:** utility functions in `src/lib/`, Zod validation schemas, custom hooks
- **Skip:** shadcn `src/components/ui/` components (not hand-authored)
- **Skip:** `src/app/` page files (test via integration or E2E)
- Firebase is always mocked via `tests/setup.ts` — never call real Firebase in unit tests

### API Route Handlers

- Call the exported `GET`/`POST` directly with a `NextRequest`; mock `@/lib/api/bearer` and Firebase Admin
- Every protected route needs at minimum: 200/201 happy path + 401 without token

## Mocking Firebase

`frontend/tests/setup.ts`:

```typescript
vi.mock('@/lib/firebase/client', () => ({ auth: ..., db: {} }))
vi.mock('@/lib/firebase/admin', () => ({ adminAuth: { verifySessionCookie: vi.fn() }, ... }))
```
