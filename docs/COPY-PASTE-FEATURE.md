# Part 2 — Build Your First Feature

This is a no-shortcuts version of building a feature: no AI tools, no Claude Code skills, no
judgment calls about "where roughly this code goes." Every file below tells you the **exact
path** and gives you the **exact, complete content** to put there.

**Before you start:** finish **[Part 1 — Setup](COPY-PASTE-SETUP.md)** first. You should have
the app running at `http://localhost:3000` and be able to sign up and land on `/dashboard`.

By the end you'll have a working "notes" feature — signed-in users can write a note and see only
their own notes, live-updating, correctly secured so nobody can read or write someone else's —
built and shipped the same way every change goes into this repo: its own branch, verified,
committed, opened as a pull request.

[![Watch the video](https://img.youtube.com/vi/hCSTrx8dOrE/maxresdefault.jpg)](https://youtu.be/hCSTrx8dOrE)

---

## Step 0 — Create a branch

Never make changes directly on `main`. Create a branch named after what you're building:

```bash
git checkout main
git pull origin main
git checkout -b feature/notes
```

`feature/{kebab-case-name}` is the naming convention this repo uses — see
[GIT-WORKFLOW.md](GIT-WORKFLOW.md). Everything below happens on this branch.

---

## Files you'll touch

| #   | File                                                        | New or edit?                  |
| --- | ----------------------------------------------------------- | ----------------------------- |
| 1   | `frontend/src/types/firestore.ts`                           | Edit — replace the whole file |
| 2   | `frontend/src/lib/firebase/firestore.ts`                    | Edit — replace the whole file |
| 3   | `firebase/firestore.rules`                                  | Edit — replace the whole file |
| 4   | `frontend/src/features/notes/actions/notes.actions.ts`      | New file                      |
| 5   | `frontend/src/features/notes/components/CreateNoteForm.tsx` | New file                      |
| 6   | `frontend/src/features/notes/components/NotesList.tsx`      | New file                      |
| 7   | `frontend/src/app/(dashboard)/notes/page.tsx`               | New file                      |
| 8   | `frontend/src/components/layout/Sidebar.tsx`                | Edit — replace the whole file |
| 9   | `docs/FIRESTORE-SCHEMA.md`                                  | Edit — replace the whole file |

Files 1–9 are the whole feature.

If a folder in a path doesn't exist yet (e.g. `frontend/src/features/notes/actions/`), create it
— your code editor will do this automatically when you save a new file at that path.

---

## File 1 — `frontend/src/types/firestore.ts`

**Replace the entire contents of this file with:**

```typescript
import type { Timestamp } from "firebase/firestore";

/**
 * Firestore collection type definitions.
 *
 * Keep in sync with:
 *   - src/lib/firebase/firestore.ts  (typed collection exports)
 *   - firebase/firestore.rules       (security rules)
 *   - docs/FIRESTORE-SCHEMA.md       (schema documentation)
 */

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: "user";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  _schemaVersion: 1;
}

export type CreateUserProfileInput = Omit<
  UserProfile,
  "createdAt" | "updatedAt"
>;

export interface Note {
  id: string;
  uid: string; // owner's user id — used by security rules
  title: string;
  body: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  _schemaVersion: 1;
}
```

---

## File 2 — `frontend/src/lib/firebase/firestore.ts`

**Replace the entire contents of this file with:**

```typescript
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
} from "firebase/firestore";
import { getClientDb } from "./client";
import type { Note, UserProfile } from "@/types/firestore";

/**
 * Creates a typed Firestore collection reference.
 * Use this factory to add new collections — see docs/FIRESTORE-SCHEMA.md
 */
function typedCollection<T extends DocumentData>(
  path: string,
): CollectionReference<T> {
  return collection(getClientDb(), path) as CollectionReference<T>;
}

// ── Collections ──────────────────────────────────────────────────────────────
// Add one export per Firestore collection. Keep in sync with:
//   - src/types/firestore.ts
//   - firebase/firestore.rules
//   - docs/FIRESTORE-SCHEMA.md

export function getUsersCollection() {
  return typedCollection<UserProfile>("users");
}

export function userDoc(uid: string) {
  return doc(getUsersCollection(), uid);
}

export function getNotesCollection() {
  return typedCollection<Note>("notes");
}

export function noteDoc(id: string) {
  return doc(getNotesCollection(), id);
}
```

---

## File 3 — `firebase/firestore.rules`

**Replace the entire contents of this file with:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Helper functions ───────────────────────────────────────────────────

    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }

    // Role checked against Firestore document (not custom claims).
    // For performance-critical rules, use hasCustomClaim() instead.
    function isAdmin() {
      let userPath = /databases/$(database)/documents/users/$(request.auth.uid);
      return isAuthenticated()
        && exists(userPath)
        && get(userPath).data.role == 'admin';
    }

    // Role checked against Firebase Auth custom claims — no Firestore read needed.
    // Set custom claims via Admin SDK: adminAuth.setCustomUserClaims(uid, { admin: true })
    function hasCustomClaim(claim) {
      return isAuthenticated() && request.auth.token[claim] == true;
    }

    // Soft-delete guard — filters out logically deleted documents.
    // Include in read rules: allow read: if isOwner(userId) && notDeleted();
    function notDeleted() {
      return resource == null || !('deletedAt' in resource.data) || resource.data.deletedAt == null;
    }

    // ── Collections ────────────────────────────────────────────────────────

    // users/{userId}
    // Each user can only read and update their own profile.
    // Admins can read any profile.
    // Creation is triggered by AuthProvider on first sign-in (syncUserProfile).
    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin()) && notDeleted();

      allow create: if isAuthenticated() && isOwner(userId)
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.keys().hasAll(['uid', 'email', 'role', 'createdAt', 'updatedAt', '_schemaVersion'])
        && request.resource.data.keys().hasOnly(['uid', 'email', 'displayName', 'photoURL', 'role', 'createdAt', 'updatedAt', '_schemaVersion'])
        && request.resource.data.role == 'user';  // only admin SDK can set 'admin' role

      allow update: if isAuthenticated() && isOwner(userId)
        && request.resource.data.uid == resource.data.uid    // uid is immutable
        && request.resource.data.role == resource.data.role  // role is immutable by user
        && request.resource.data.keys().hasOnly(['uid', 'email', 'displayName', 'photoURL', 'role', 'createdAt', 'updatedAt', '_schemaVersion']);

      allow delete: if false; // soft-delete only — set deletedAt field instead
    }

    // notes/{noteId}
    // Users can only read and write their own notes.
    match /notes/{noteId} {
      allow read: if isAuthenticated() && isOwner(resource.data.uid) && notDeleted();

      allow create: if isAuthenticated() && isOwner(request.resource.data.uid)
        && request.resource.data.keys().hasAll(['uid', 'title', 'body', 'createdAt', 'updatedAt', '_schemaVersion'])
        && request.resource.data.keys().hasOnly(['uid', 'title', 'body', 'createdAt', 'updatedAt', '_schemaVersion']);

      allow update: if isAuthenticated() && isOwner(resource.data.uid)
        && request.resource.data.uid == resource.data.uid  // uid is immutable
        && request.resource.data.keys().hasOnly(['uid', 'title', 'body', 'createdAt', 'updatedAt', 'deletedAt', '_schemaVersion']);

      allow delete: if false; // soft-delete only — set deletedAt instead
    }

    // ── Default deny ───────────────────────────────────────────────────────
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**This file only takes effect once you deploy it.** After saving, run this in your terminal from
the repo root (no install needed — `npx` downloads the Firebase CLI on the fly the first time):

```bash
npx firebase-tools deploy --only firestore:rules
```

(First time only: run `npx firebase-tools login` — it opens a browser to authorize.)

---

## File 4 — `frontend/src/features/notes/actions/notes.actions.ts`

**This is a new file. Create it with this content:**

```typescript
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/actions/auth.actions";
import { Timestamp } from "firebase-admin/firestore";
import type { ActionResult } from "@/types";

const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(10_000),
});

export async function createNote(
  input: unknown,
): Promise<ActionResult<string>> {
  const session = await requireAuth();

  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Invalid input",
    };
  }

  try {
    const now = Timestamp.now();
    const ref = await adminDb.collection("notes").add({
      ...parsed.data,
      uid: session.uid,
      createdAt: now,
      updatedAt: now,
      _schemaVersion: 1,
    });
    return { success: true, data: ref.id };
  } catch {
    return { success: false, error: "Failed to create note" };
  }
}
```

---

## File 5 — `frontend/src/features/notes/components/CreateNoteForm.tsx`

**This is a new file. Create it with this content:**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createNote } from '@/features/notes/actions/notes.actions'

const createNoteFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().max(10_000),
})

type CreateNoteFormInput = z.infer<typeof createNoteFormSchema>

export function CreateNoteForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoteFormInput>({
    resolver: zodResolver(createNoteFormSchema),
  })

  const onSubmit = async (data: CreateNoteFormInput) => {
    const result = await createNote(data)
    if (result.success) {
      toast.success('Note created')
      reset()
    } else {
      toast.error(result.error ?? 'Failed to create note')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-500 focus:outline-none aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Note title"
          {...register('title')}
        />
        {errors.title && (
          <p id="title-error" className="text-xs text-red-500" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="body" className="text-sm font-medium">
          Body
        </label>
        <textarea
          id="body"
          rows={3}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Write something..."
          {...register('body')}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {isSubmitting ? 'Saving…' : 'Add note'}
      </button>
    </form>
  )
}
```

---

## File 6 — `frontend/src/features/notes/components/NotesList.tsx`

**This is a new file. Create it with this content:**

```typescript
'use client'

import { where } from 'firebase/firestore'
import { useCollection } from '@/hooks/useFirestore'
import { useAuth } from '@/hooks/useAuth'
import { getNotesCollection } from '@/lib/firebase/firestore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'

export function NotesList() {
  const { user } = useAuth()
  const { data: notes, loading } = useCollection(
    getNotesCollection(),
    where('uid', '==', user?.uid ?? '')
  )

  if (loading) return <LoadingSpinner />
  if (notes.length === 0) return <EmptyState title="No notes yet" />

  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li key={note.id} className="rounded-lg border p-4">
          <h3 className="font-medium">{note.title}</h3>
          <p className="text-sm text-zinc-500">{note.body}</p>
        </li>
      ))}
    </ul>
  )
}
```

---

## File 7 — `frontend/src/app/(dashboard)/notes/page.tsx`

**This is a new file. Create it with this content.** Note the folder name has literal
parentheses: `(dashboard)`.

```typescript
import type { Metadata } from 'next'
import { requireAuth } from '@/actions/auth.actions'
import { PageHeader } from '@/components/layout/PageHeader'
import { CreateNoteForm } from '@/features/notes/components/CreateNoteForm'
import { NotesList } from '@/features/notes/components/NotesList'

export const metadata: Metadata = { title: 'Notes' }

export default async function NotesPage() {
  await requireAuth()
  return (
    <div className="space-y-6">
      <PageHeader title="Notes" description="Your personal notes" />
      <CreateNoteForm />
      <NotesList />
    </div>
  )
}
```

---

## File 8 — `frontend/src/components/layout/Sidebar.tsx`

**Replace the entire contents of this file with:**

```typescript
import Link from 'next/link'
import { LayoutDashboard, StickyNote, User, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-14 items-center px-4 border-b border-zinc-200 dark:border-zinc-800">
        <span className="font-semibold text-sm">
          {process.env.NEXT_PUBLIC_APP_NAME ?? 'App'}
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

---

## File 9 — `docs/FIRESTORE-SCHEMA.md`

**Replace the entire contents of this file with:**

```markdown
# Firestore Schema

## Overview

All collections use the typed collection pattern — see `frontend/src/lib/firebase/firestore.ts`.
Security rules are in `firebase/firestore.rules`.

## Schema versioning

Every document in every collection **must** include a `_schemaVersion` field:

\`\`\`typescript
_schemaVersion: 1 // increment when doing a breaking schema change
\`\`\`

This enables **lazy migration** — when a document is read, check `_schemaVersion` and migrate on the fly if it's behind current.

**Rules:**

- `_schemaVersion` is always `1` on creation
- Non-breaking changes (adding optional fields with defaults) keep the same version
- Breaking changes (rename, remove, type change) increment the version and require a migration function
- Never remove `_schemaVersion` from a schema

---

## `users` collection

**Path:** `/users/{userId}`
**Access:** Owner-only (user can read/write their own document; admins can read all)

| Field            | Type                | Required | Description                                  |
| ---------------- | ------------------- | -------- | -------------------------------------------- |
| `uid`            | `string`            | Yes      | Firebase Auth UID (same as document ID)      |
| `email`          | `string`            | Yes      | User's email address                         |
| `displayName`    | `string \| null`    | Yes      | Display name from Auth or profile            |
| `photoURL`       | `string \| null`    | Yes      | Profile photo URL                            |
| `role`           | `'user' \| 'admin'` | Yes      | User role — immutable by user after creation |
| `createdAt`      | `Timestamp`         | Yes      | When the document was created                |
| `updatedAt`      | `Timestamp`         | Yes      | When the document was last updated           |
| `_schemaVersion` | `1`                 | Yes      | Schema version for lazy migration            |

**Creation:** Auto-created by `AuthProvider` on first sign-in via `syncUserProfile()`.
**Deletion:** Hard-delete is disabled in security rules. Use `deletedAt` field for soft-delete.

---

## `notes` collection

**Path:** `/notes/{noteId}`
**Access:** Owner-only

| Field            | Type        | Required | Description                       |
| ---------------- | ----------- | -------- | --------------------------------- |
| `uid`            | `string`    | Yes      | Owner's Firebase Auth UID         |
| `title`          | `string`    | Yes      | Note title (1–200 chars)          |
| `body`           | `string`    | Yes      | Note body (≤10 000 chars)         |
| `createdAt`      | `Timestamp` | Yes      | Creation time                     |
| `updatedAt`      | `Timestamp` | Yes      | Last update time                  |
| `_schemaVersion` | `1`         | Yes      | Schema version for lazy migration |

---

<!-- Add new collection schemas below -->
```

---

## Try it

```bash
pnpm run dev
```

1. Open [http://localhost:3000](http://localhost:3000) and sign in (or sign up if you don't have
   an account yet)
2. Click **Notes** in the sidebar
3. Type a title, optionally a body, click **Add note**
4. It should appear in the list immediately — no page refresh

If you see "Missing or insufficient permissions," you forgot to deploy the rules from File 3
(`npx firebase-tools deploy --only firestore:rules`).

---

## Verify (plain commands, no tooling beyond pnpm)

Run these from the repo root:

```bash
pnpm run typecheck   # must report no errors
pnpm run lint        # must report no errors
pnpm run test        # unit tests must all pass
pnpm run build       # confirms the production build compiles
```

All four must pass before you move on.

---

## Commit, push, and open a pull request

```bash
git add .
git commit -m "feat: add notes feature"
```

The commit message must start with `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, or `chore:` —
a git hook rejects anything else. If you made several unrelated changes, commit them separately
instead of bundling everything into one message.

```bash
git push -u origin feature/notes
```

Then open a pull request back into `main`. Either through GitHub's website (it'll show a
"Compare & pull request" banner right after the push), or from the terminal if you have the
[GitHub CLI](https://cli.github.com) installed:

```bash
gh pr create --base main --title "feat: add notes feature" \
  --body "Adds a notes feature — users can create and see their own notes."
```

Once CI passes (lint, typecheck, tests all run automatically on the PR) and it's reviewed,
merge it. `main` is protected — you can't push to it directly, which is why Step 0 had you
branch off it in the first place.

---

## What you just built

- A feature branch, kept separate from `main` until the work was reviewed and merged
- A Firestore collection (`notes`) with a TypeScript type, a typed collection accessor, and
  security rules that only let a user read or write their own documents
- A Server Action (`createNote`) — the standard pattern every mutation in this app follows:
  check who's asking, validate the input, write, never throw
- A form that calls it, with client-side validation and success/error feedback
- A live-updating list powered by a Firestore realtime subscription
- A verified, committed, reviewed pull request — the same loop every change in this repo follows

Every piece here mirrors a real pattern in the codebase — `users` (auth profiles) works exactly
the same way. See [ARCHITECTURE.md](ARCHITECTURE.md) if you want to understand _why_ it's shaped
this way, or [TUTORIAL-WALKTHROUGH.md](TUTORIAL-WALKTHROUGH.md) for the verified results of
exactly this build (every HTTP status code, every allow/deny security rule case) run against a
real Firebase project.
