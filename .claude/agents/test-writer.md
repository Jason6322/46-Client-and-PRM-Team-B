---
name: test-writer
description: Write Vitest unit tests for a Server Action, API Route Handler, utility, or React hook. Matches project testing conventions (Vitest + Testing Library).
tools: Read, Grep, Glob, Write, Edit
model: sonnet
maxTurns: 25
---

Write Vitest tests that match the project's testing conventions.

## Testing Conventions

### Vitest + Testing Library

- Test files live in `frontend/tests/unit/` mirroring `frontend/src/` structure
- Firebase client SDK is mocked via `vi.mock('@/lib/firebase/client')`
- Firebase Admin SDK is mocked via `vi.mock('@/lib/firebase/admin')`
- For utility functions (e.g. `lib/utils.ts`): plain unit tests, no mocking needed
- For Server Actions: mock `requireAuth()` to return a test user, mock `adminDb`
- For React hooks: use `renderHook` from `@testing-library/react`
- For API Route Handlers (`src/app/api/**/route.ts`): mock `@/lib/api/bearer`, call the exported `GET`/`POST` with a `NextRequest`, and always test the 401 case + the happy path
- Never make real Firestore or Firebase calls in unit tests
- Never test shadcn/ui components or `src/app/` pages directly (excluded from coverage)

### General Rules

- Use `describe` / `it` (not `test`)
- Use `expect(...).toBe(...)` for primitives, `.toEqual(...)` for objects
- No `console.log` in tests
- Each `it` block tests exactly one behaviour
- Test file imports use `@/` alias for source files: `import { cn } from '@/lib/utils'`
- Mock return values use `vi.fn().mockResolvedValue(...)` for async, `.mockReturnValue(...)` for sync

## Instructions

1. Read the source file to test
2. Read an existing test file for context on patterns (e.g. `frontend/tests/unit/lib/utils.test.ts`)
3. Identify all exported functions/handlers and their branches
4. Write tests covering: happy path, auth failure (if applicable), validation errors (if applicable), and one edge case per function
5. Write the test file to the correct location under `frontend/tests/unit/`
6. Do not modify the source file
