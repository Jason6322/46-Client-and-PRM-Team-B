# CLAUDE.md — Garage Boilerplate

This file provides full context for Claude Code. Read it before making any changes.
Client projects that fork this repo should update this file with their own project details.

---

## Project Overview

**Type:** Streamlined boilerplate for student capstone projects.
**Purpose:** Zero-friction foundation for Next.js + Firebase web applications. No Docker, no local emulator, no paid Firebase plan required — `pnpm install` plus a free Firebase project (Spark plan) is enough to run the app.

New to the repo? Read `docs/GUIDE.md` — it walks through building a feature end-to-end.

---

## Tech Stack

| Layer              | Technology                                                              |
| ------------------ | ----------------------------------------------------------------------- |
| Frontend framework | Next.js 16 (App Router, React 19)                                       |
| Language           | TypeScript 5 — strict mode                                              |
| Styling            | Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`)             |
| UI components      | Raw Tailwind (shadcn can be added per project)                          |
| Backend            | Next.js Server Actions + Route Handlers (Vercel Functions)              |
| Database           | Firestore                                                               |
| Auth               | Firebase Authentication                                                 |
| Package manager    | pnpm workspaces — **always use pnpm, never npm or yarn**                |
| Testing            | Vitest + Testing Library                                                |
| Git hooks          | Lefthook (commit-msg: Conventional Commits · pre-commit: lint + format) |
| CI/CD              | GitHub Actions                                                          |

---

## Repository Structure

```
/
├── frontend/          Next.js 16 App Router (deploys to Vercel)
├── firebase/          Firestore rules, indexes
├── docs/              Architecture and conventions docs (start with GUIDE.md)
├── scripts/           Utility scripts (bootstrap, validate-placeholders, migrations)
└── .claude/           Claude Code harness (agents, skills, MCP, settings, hooks)
```

**Nested instructions** are loaded automatically when editing files in the frontend:

- `frontend/CLAUDE.md` — Next.js 16, App Router, Server Components, auth flow, design reference

---

## Codebase Map — read this instead of exploring

Everything a feature build needs already exists below. **Do not survey the codebase before implementing** — consult this map, then Read only the files you will edit. A complete worked example (every file of a real feature, verified) is in `docs/TUTORIAL-WALKTHROUGH.md`.

### Frontend building blocks

| File                                         | Exports                                                                                                                                                                                                       | Use for                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `frontend/src/actions/auth.actions.ts`       | `requireAuth()` (redirects if unauthed, returns session with `.uid`), `getServerSession()`, `serverSignOut()`                                                                                                 | First line of every Server Action / protected page              |
| `frontend/src/lib/firebase/admin.ts`         | `adminAuth`, `adminDb` (lazy, `server-only`)                                                                                                                                                                  | All server-side Firebase                                        |
| `frontend/src/lib/firebase/client.ts`        | `getClientApp/Auth/Db()`                                                                                                                                                                                      | Browser SDK (Client Components only)                            |
| `frontend/src/lib/firebase/firestore.ts`     | `getUsersCollection()`, `userDoc(uid)`, `getOrganisationsCollection()`, `organisationDoc(id)` — add new collections here as `get{X}Collection()` functions (`typedCollection` is module-private)              | Typed collection access (client SDK)                            |
| `frontend/src/lib/firebase/auth.ts`          | `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `signOut`, `resetPassword`, `getIdToken`                                                                                                            | Client sign-in flows                                            |
| `frontend/src/hooks/useFirestore.ts`         | `useCollection(ref, ...constraints)` → `{ data, loading, error }` (onSnapshot)                                                                                                                                | Realtime lists in Client Components                             |
| `frontend/src/hooks/useAuth.ts`              | `useAuth()` → `{ user, profile, ... }` (AuthContext)                                                                                                                                                          | Current user in Client Components                               |
| `frontend/src/types/index.ts`                | `ActionResult<T>` `{ success, error?, data? }` + re-exports of `types/auth.ts`, `types/firestore.ts`                                                                                                          | Return type of every Server Action                              |
| `frontend/src/types/firestore.ts`            | `UserProfile`, `Organisation`, `OrganisationContact`, `Create/UpdateOrganisationInput` — add new collection interfaces here (always with `_schemaVersion: 1`)                                                 | Collection types                                                |
| `frontend/src/lib/validations/`              | `loginSchema`, `signupSchema`, `registerSchema`, `resetPasswordSchema` (`auth.ts`) · `idSchema`, `paginationSchema` (`common.ts`) · organisation schemas (`organisation.ts`, see Organisations feature below) | Zod schemas — add feature schemas here or in the feature folder |
| `frontend/src/lib/viewerTimeZone.ts`         | `getViewerTimeZone()` (`server-only`; reads the `tz` cookie written by `TimeZoneCookie` in `Providers`) · `lib/timeZone.ts`: `TIME_ZONE_COOKIE`, `isValidTimeZone`                                            | "Today" in the viewer's zone from a Server Component            |
| `frontend/src/lib/utils.ts`                  | `cn()`, `formatDate`, `formatDatetime`, `formatRelativeTime` ("2h ago", "5d ago"), `truncate`                                                                                                                 | Class merging, formatting                                       |
| `frontend/src/components/layout/`            | `DashboardShell`, `TopNav` (navItems array — add links here; right side is the avatar/name/role block and sign out), `PageHeader { title, description?, actions? }`                                           | App shell                                                       |
| `frontend/src/providers/`                    | `Providers` (root composition) → `QueryProvider` (TanStack Query, `staleTime` 60s), `AuthProvider`, sonner `Toaster`                                                                                          | Client providers — wrap new ones in `providers/index.tsx`       |
| `frontend/src/components/shared/`            | `Card { title?, className?, children }`, `ErrorBoundary`, `LoadingSpinner`, `FullPageSpinner`, `EmptyState { title, description?, icon?, action? }`, `AutoGrowTextarea { registration }`                      | Surfaces, loading/empty/error states                            |
| `frontend/src/app/api/auth/session/route.ts` | POST (token → `__session` cookie), DELETE                                                                                                                                                                     | Already wired — don't touch for features                        |
| `frontend/src/lib/api/problem.ts`            | `problem(status, title, detail)`, `unauthorized(detail?)` → RFC 9457 `NextResponse`                                                                                                                           | Errors from API Route Handlers                                  |
| `frontend/src/lib/api/bearer.ts`             | `verifyBearer(req)` → `BearerUser \| null` (verifies `Authorization: Bearer <ID token>`)                                                                                                                      | Auth in API Route Handlers                                      |

### Organisations feature (`frontend/src/features/organisations/`)

The first complete feature — copy its shape for new ones. The backend is Next.js Server Actions.

| File                               | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Use for                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `actions/organisations.actions.ts` | `createOrganisation`, `getOrganisation`, `listOrganisations`, `listArchivedOrganisations`, `updateOrganisation`, `changePipelineStage`, `setNextAction`, `saveRelationshipManagement(id, input, advanceStage?)`, `logActivity(id, input)`, `setActivityArchived(id, activityId, archived)`, `listOrganisationActivities(id)`, `listUpcomingMeetings({ organisationIds, from, to })`, `listCalendarMeetings({ from, to })` (every organisation, with names), `archiveOrganisation`, `restoreOrganisation`, `deleteOrganisationPermanently` (archived only; also removes its activities and opportunities) — all `ActionResult`                                                                      | Every read and write (Admin SDK, `requireAuth()` first)                |
| `types.ts`                         | `OrganisationListItem` — `Organisation` with every Timestamp as millis · `MeetingWithOrganisation` · `isLoggedActivity`, `describeActivity`, `byOccurrence(activities, now)` (upcoming soonest-first, then past newest-first)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | What components receive; Timestamps can't cross to the client          |
| `constants.ts`                     | `ORGANISATION_TYPES`, `PIPELINE_STAGES` (12, from the dashboard chart), `DEFAULT_PIPELINE_STAGE`, `RELATIONSHIP_STATUSES`, `nextPipelineStage(stage)`, `LOGGED_ACTIVITY_TYPES`, `ACTIVITY_TYPE_CLASSES`, `LEAD_PRIORITIES` (Low→Urgent), `LEAD_PRIORITY_CLASSES`, `byLeadPriority` (Urgent first), `leadScoreToPriority`                                                                                                                                                                                                                                                                                                                                                                           | Enums                                                                  |
| `followUp.ts`                      | `dateOnlyToDate`, `millisToDateOnly`, `isOverdue(ms, timeZone?)`, `isDueToday(ms, timeZone?)`, `describeDue(ms, timeZone?)` ("Due in 3d", "Overdue by 2d"), `isDateOnly` — Server Components must pass `getViewerTimeZone()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Due dates — stored at 12:00 UTC on the day                             |
| `search.ts`                        | `SearchFilters`, `EMPTY_FILTERS`, `filtersFromParams(searchParams)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | The `/search` page's filters, shared by the page and `SearchAndFilter` |
| `lib/validations/organisation.ts`  | Storage: `createOrganisationSchema`, `updateOrganisationSchema` (partial — omits absent keys, applies no defaults), `pipelineStageSchema`, `nextActionSchema`, `relationshipManagementSchema` · Form: `organisationFormSchema`, `toCreateOrganisationInput`, `toOrganisationFormValues`, `relationshipManagementFormSchema`, `toRelationshipManagementInput`                                                                                                                                                                                                                                                                                                                                       | Form schema speaks strings; storage schema speaks nulls                |
| `components/`                      | `OrganisationsTable`, `OrganisationForm { organisation? }` (create and edit), `OrganisationDetail`, `OrganisationDetailsCard`, `ContactsCard`, `PipelineStageSelect`, `NextActionEditor`, `ArchiveOrganisationButton`, `ArchivedOrganisationsTable`, `RelationshipManagementForm`, `LinkedOrganisationSummary`, `PipelineBoard`, `PipelineTab`, `MeetingsActivities { organisation, activities }`, `ActivityCalendar` (+ `dayKey`, `CALENDAR_MEETINGS_KEY`; shows every organisation's meetings via TanStack Query), `LeadPriorityBadge`, `ExistingOrganisationsPanel { variant }` (`add` or `list`) (Add form / Organisations list overview), `SearchAndFilter { organisations, initialFilters }` | UI                                                                     |

Archiving is a soft delete (`deletedAt`) and is separate from the `Archived` pipeline stage. Lists fetch the collection once and filter in memory — no composite indexes are needed. `organisations` security rules (and its `activities` subcollection) allow signed-in client-SDK reads of non-archived records and deny all client writes — every write goes through the Server Actions (Admin SDK). Client list queries must filter `where('deletedAt', '==', null)`.

### Firestore rules helpers (`firebase/firestore.rules`)

`isAuthenticated()` · `isOwner(uid)` · `isAdmin()` (Firestore read) · `hasCustomClaim(claim)` (no read) · `notDeleted()`

### Existing routes/pages

Pages: `/` · `/auth/signin` · `/auth/signup` · `/dashboard` · `/profile` · `/settings` · `/organisations` · `/organisations/new` · `/organisations/[id]` · `/organisations/[id]/edit` · `/organisations/archived` · `/relationships` (organisation picker) · `/relationships/[id]` (relationship management; same component as the profile's Relationship Management tab) · `/pipeline` (drag-and-drop stage board) · `/meetings` (organisation picker) · `/meetings/[id]` (interaction timeline and logging) (route groups `(auth)`, `(dashboard)`). `/opportunities` (table), `/opportunities/[id]` (detail and related panel) and `/opportunities/new` complete the nav. `/search` (Search & Filter; opened from the search button in the top nav, filters kept in the query string).

API (Next.js Route Handlers on Vercel — these are what the live URL serves): `GET /api/health` (public) · `GET /api/me` (returns `{ uid, email }`; requires `Authorization: Bearer <ID token>`) · `POST|DELETE /api/auth/session`.

There is no separate backend server. Use Server Actions for anything the app's own UI does; add a Route Handler under `frontend/src/app/api/` only when something outside the UI needs an HTTP URL (webhooks, cron, other clients).

---

## MCP Servers

Run `/mcp` in Claude Code to view and configure. Three servers are pre-configured:

| Server       | Purpose                                                                              | Setup                          |
| ------------ | ------------------------------------------------------------------------------------ | ------------------------------ |
| **context7** | Up-to-date library docs (Next.js, Firebase, Tailwind, etc.)                          | No auth needed                 |
| **firebase** | 30+ Firebase tools — deploy rules, query Firestore, manage auth users                | Run `firebase login`           |
| **stitch**   | Google Stitch design-to-code — fetch design tokens, screen code from Stitch projects | Set `STITCH_API_KEY` in `.env` |

**Usage tips:**

- Say "use context7" when asking about library APIs to get current docs
- Use the Firebase MCP to inspect Firestore data or deploy rules without leaving Claude Code
- Use the Stitch MCP to import UI designs: "fetch the design tokens from my Stitch project"

---

## Sub-agents

Sub-agents run in their own isolated context with a tailored system prompt. Claude delegates to them automatically, or you can invoke them by name:

| Agent               | Description                                                                                                                               | Model  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `doc-auditor`       | Audits skills, docs, and CLAUDE.md for drift against the actual codebase. Use before a PR or after a major refactor.                      | Opus   |
| `security-reviewer` | Audits staged changes for auth, input validation, Firestore rules, secret handling, and architecture violations. Use before opening a PR. | Opus   |
| `test-writer`       | Writes Vitest unit tests for a given file matching project conventions (Testing Library).                                                 | Sonnet |

**Usage examples:**

- "Use the security-reviewer agent to audit my staged changes before I open this PR"
- "Use the doc-auditor agent to check if the skills are still accurate"
- "Use the test-writer agent to write tests for `frontend/src/app/api/health/route.ts`"

---

## Available Skills

Run these with `/skill-name` in Claude Code:

**Setup**

| Skill        | Description                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/bootstrap` | Full local setup: prerequisites → install → .env (walks you through creating a free Firebase project) → dev server → auth smoke test |

**Scaffolding**

| Skill                  | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `/new-feature`         | Scaffold a feature module (types, hook, Server Actions, component) |
| `/new-page`            | Create a Next.js App Router page in the correct route group        |
| `/new-component`       | Create a React component (Server or Client) with typed props       |
| `/firebase-collection` | Add a typed Firestore collection (type + rules + hook + docs)      |
| `/add-auth-provider`   | Add an OAuth provider (Firebase config + sign-in button)           |
| `/evolve-schema`       | Safely evolve a Firestore collection schema                        |
| `/add-env-var`         | Add an env var consistently across packages and docs               |

**Quality & verification**

| Skill                                     | Description                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `/verify`                                 | Full pipeline: lint → typecheck → test → console.log scan → READY/NOT READY verdict |
| `/checkpoint create\|verify\|list [name]` | Mark stable milestones, compare against them later                                  |
| `/save-session [name]`                    | Save session state (8-section format) to `.claude/sessions/`                        |
| `/resume-session [name]`                  | Load a saved session and resume from exact stopping point                           |

**Git workflow**

| Skill          | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `/git-feature` | Create `feature/*` branch from `main` + draft PR back to `main` |
| `/git-hotfix`  | Create `hotfix/*` branch from `main` + PR back to `main`        |
| `/git-release` | Tag the current `main` as a milestone/submission checkpoint     |

---

## Agent Permissions

**CAN do autonomously:**

- Create feature branches from `main` and commit/push to them
- Create draft PRs targeting `main`
- Read, edit, and create files within the repo
- Run `pnpm` commands (lint, typecheck, test, build)
- Use MCP tools (context7, firebase, stitch)

**CANNOT do without explicit user approval:**

- Merge or close PRs
- Push to `main` directly
- Delete branches
- Deploy to production (`firebase deploy`)
- Modify CI/CD workflow files

---

## Critical Conventions

### Package manager

Always use `pnpm`. Run commands as:

- `pnpm install` (not `npm install`)
- `pnpm --filter frontend add {package}`
- `pnpm -r lint` (run across all packages)

### TypeScript

- Strict mode is on. **Never use `any`** — use `unknown` and narrow.
- `noUncheckedIndexedAccess` is on — array index access returns `T | undefined`.
- Use `type` imports: `import type { Foo } from '...'`
- The `@/` alias maps to `frontend/src/`. Always use it — never relative paths more than one level deep.

### React / Next.js

- **Server Components by default** — all files in `app/` are Server Components unless `'use client'` is at the top.
- Add `'use client'` only when you actually need: React hooks, event handlers, or browser APIs.
- Never import `firebase/auth` or `firebase/firestore` in a Server Component — these are client-only SDKs.
- For server-side Firebase, always use `@/lib/firebase/admin` (imports `server-only`).
- Server Actions return `ActionResult<T>`: `{ success: boolean, error?: string, data?: T }`.
- Use `sonner` (`toast` from `sonner`) for all user-facing notifications.

### Firestore

- Every collection has a typed collection export in `frontend/src/lib/firebase/firestore.ts`.
- Every collection has security rules in `firebase/firestore.rules`.
- Every collection is documented in `docs/FIRESTORE-SCHEMA.md`.
- Always call `requireAuth()` in Server Actions before any Firestore operation.
- Use the soft-delete pattern (add `deletedAt: Timestamp`) instead of hard deletes.

### API Route Handlers

- Every route under `frontend/src/app/api/` except `/api/health` and `/api/auth/session` calls `verifyBearer(req)` first and returns `unauthorized()` when it is null.
- Return errors with `problem(status, title, detail)` from `@/lib/api/problem` (RFC 9457) — never leak stack traces.
- Validate request bodies with Zod before use.
- Unit tests mock Firebase Admin (no real Firebase calls).

### Git

- Branch from `main` for everything (`feature/*`, `hotfix/*`). Never commit directly to `main`.
- Commit messages must follow Conventional Commits — enforced by the `commit-msg` hook.
- Use `/git-feature`, `/git-hotfix`, `/git-release` skills for branch management.

### Harness integrity

- When you change a code pattern that is documented in `.claude/skills/` or `docs/`, update those files in the same session — never let them drift.
- When you add or move a core export (lib, hooks, middleware), update the **Codebase Map** section above in the same session — it is what keeps future sessions from re-exploring the repo. The `doc-auditor` agent checks it for drift.
- Skills and agents must discover files dynamically using `Glob` or `Grep` — never hardcode file lists or paths that will break when files move. (The Codebase Map is the one deliberate exception, maintained by the rule above.)

---

## What To Avoid

- `npm` or `yarn` — use `pnpm`
- `any` in TypeScript — use `unknown` + type narrowing
- `pages/` directory — this is App Router only
- `firebase/compat` — modular SDK only
- Firebase Cloud Storage — removed from this boilerplate; it requires the paid Blaze plan. Store file metadata in Firestore, or use a free third-party host, if a feature needs uploads.
- Docker / local Firebase emulators — not part of this setup; the app always talks to your real (free Spark-plan) Firebase project
- `NEXT_PUBLIC_` prefix on secret values (service account, API keys)
- Committing `.env.local` or `.env` — they are gitignored
- Committing directly to `main`
- Inline styles — use Tailwind classes
- CSS-in-JS (styled-components, emotion) — not part of this stack

---

## Environment Variables

**Single source of truth: the root `.env`** (template: `.env.example`). `pnpm run env:sync` (`scripts/sync-env.js`) generates `frontend/.env.local` from it — that file is generated output, never edit it directly. The sync runs automatically before `pnpm run dev`.

When adding a variable, use the `/add-env-var` skill — it updates `.env.example`, `scripts/sync-env.js`, and `docs/ENV-VARS.md` together. See `docs/ENV-VARS.md` for the full variable reference.

---

## Running the Project

```bash
pnpm install              # Install all workspace dependencies
pnpm run validate         # Check for unreplaced template placeholders
pnpm run dev              # Start the frontend dev server (talks to your real Firebase project)
pnpm run test             # Frontend unit tests
pnpm run lint             # ESLint across all packages
pnpm run typecheck        # TypeScript check across all packages
pnpm --filter frontend seed               # Dry run of the demo data (40 orgs, activity, opportunities)
pnpm --filter frontend seed -- --write    # Write it — shared project, visible on the live site
pnpm --filter frontend seed -- --clean    # Remove everything the seed wrote (`_seed: true`)
```

---

## Forking for a New Client Project

When forking this boilerplate for a new client:

1. **Update this file** — replace the overview section with client project details
2. **Replace `.firebaserc`** — set the client's Firebase project ID
3. **Update `.env.example`** — fill in `NEXT_PUBLIC_APP_NAME` default if the client has one
4. **Delete** `frontend/src/features/example-feature/` — it's a scaffold template only
5. **Update `docs/ARCHITECTURE.md`** with the client's actual system design
6. Run `pnpm run validate` — must return zero errors before first commit
