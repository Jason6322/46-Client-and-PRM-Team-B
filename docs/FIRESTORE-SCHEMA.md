# Firestore Schema

## Overview

All collections use the typed collection pattern — see `frontend/src/lib/firebase/firestore.ts`.
Security rules are in `firebase/firestore.rules`.

When adding a new collection, use the `/firebase-collection` Claude Code skill.

## Schema versioning

Every document in every collection **must** include a `_schemaVersion` field:

```typescript
_schemaVersion: 1; // increment when doing a breaking schema change
```

This enables **lazy migration** — when a document is read, check `_schemaVersion` and migrate on the fly if it's behind current. See the `/evolve-schema` skill for the full migration workflow.

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

## `organisations` collection

**Path:** `/organisations/{organisationId}`
**Access:** Team-shared — any authenticated team member can read and write. _(Pending confirmation — see "Open question" below.)_

| Field                   | Type                                               | Required | Description                                                       |
| ----------------------- | -------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| `name`                  | `string`                                           | Yes      | Organisation name                                                 |
| `type`                  | `'Industry Partner' \| 'Client' \| 'Collaborator'` | Yes      | Relationship type                                                 |
| `industry`              | `string \| null`                                   | Yes      | Industry / sector                                                 |
| `country`               | `string`                                           | Yes      | Country (free text, e.g. "Melbourne, Australia")                  |
| `website`               | `string \| null`                                   | Yes      | Website URL                                                       |
| `relationshipOwner`     | `string`                                           | Yes      | Team member who owns the relationship                             |
| `tags`                  | `string[]`                                         | Yes      | Free-text tags; empty array when none                             |
| `pipelineStage`         | `PipelineStage`                                    | Yes      | One of the 12 stages; defaults to `Prospect`                      |
| `primaryContact`        | `OrganisationContact`                              | Yes      | Main contact — `name` required                                    |
| `secondaryContact`      | `OrganisationContact \| null`                      | Yes      | Optional second contact                                           |
| `notes`                 | `string \| null`                                   | Yes      | Free-text notes                                                   |
| `relationshipStatus`    | `'Active' \| 'Prospect' \| null`                   | No       | Shown as `Stage · Status`; null until set. The BRD may add values |
| `nextAction`            | `string \| null`                                   | No       | Next follow-up owed; absent on older docs → `null`                |
| `businessResearchNotes` | `string \| null`                                   | No       | Relationships screen — Research                                   |
| `qualificationInfo`     | `string \| null`                                   | No       | Relationships screen — Research                                   |
| `leadScore`             | `number \| null`                                   | No       | 0–100, entered by hand; shown as a progress bar                   |
| `researchStatus`        | `string \| null`                                   | No       | Relationships screen — Research                                   |
| `businessBrief`         | `string \| null`                                   | No       | Link or reference to the brief                                    |
| `outreachStatus`        | `string \| null`                                   | No       | Relationships screen — Outreach & Follow-up                       |
| `communicationRecord`   | `string \| null`                                   | No       | Relationships screen — Outreach & Follow-up                       |
| `followUpStatus`        | `string \| null`                                   | No       | Relationships screen — Outreach & Follow-up                       |
| `relationshipNotes`     | `string \| null`                                   | No       | Strategic notes; distinct from `notes`, which is about contacts   |
| `nextActionDueAt`       | `Timestamp \| null`                                | No       | Follow-up due date, stored at 12:00 UTC on the day                |
| `createdBy`             | `string`                                           | Yes      | UID of the creating user                                          |
| `createdAt`             | `Timestamp`                                        | Yes      | When the document was created                                     |
| `updatedAt`             | `Timestamp`                                        | Yes      | When the document was last updated                                |
| `lastActivityAt`        | `Timestamp`                                        | Yes      | Drives the "Last Activity" column and list ordering               |
| `deletedAt`             | `Timestamp \| null`                                | Yes      | Soft-delete marker; `null` when active                            |
| `_schemaVersion`        | `1`                                                | Yes      | Schema version for lazy migration                                 |

`OrganisationContact` is `{ name: string; role: string \| null; email: string \| null; phone: string \| null }`.

**Pipeline stages:** Prospect, Research, Qualified, Outreach, Follow-up, Meeting, Proposal, Negotiation, Partnership, Active Relationship, Completed, Archived — the order used by the "Relationships by Pipeline Stage" chart on the dashboard.

**Archiving vs the Archived stage:** these are two different things. `deletedAt` is a soft delete — the record is hidden from lists but kept. The `Archived` _pipeline stage_ means the relationship ended while the record stays active in the CRM.

**Creation:** `createOrganisation()` in `frontend/src/features/organisations/actions/organisations.actions.ts`.
**Deletion:** Soft-delete only, via `archiveOrganisation()`. Reverse with `restoreOrganisation()`.

**Open question:** security rules for this collection are **not yet written** — see the default-deny block in `firebase/firestore.rules`. Until they are added, every read and write to `organisations` is rejected.

---

## `activities` subcollection

**Path:** `/organisations/{organisationId}/activities/{activityId}`
**Access:** Same as the parent organisation. Rules are matched by path, not inherited from the parent, so this needs its own `match` block — **not written yet**.

Two kinds of entry share this subcollection, distinguished by `type`, so the interaction timeline and the stage history are one ordered record rather than two stores to merge.

| Field           | Type                                                                    | Description                                                                               |
| --------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `type`          | `'stage_change' \| 'Meeting' \| 'Call' \| 'Email' \| 'Note' \| 'Other'` | `stage_change` is written by the app; the rest are logged by hand                         |
| `fromStage`     | `PipelineStage \| null`                                                 | Stage changes only; `null` for the first entry                                            |
| `toStage`       | `PipelineStage \| null`                                                 | Stage changes only                                                                        |
| `occurredAt`    | `Timestamp \| null`                                                     | Logged activities only — when the interaction happened, which is not when it was recorded |
| `attendees`     | `string \| null`                                                        | Logged activities only                                                                    |
| `agenda`        | `string \| null`                                                        | Logged activities only                                                                    |
| `notes`         | `string \| null`                                                        | Notes / minutes                                                                           |
| `outcome`       | `string \| null`                                                        | Logged activities only                                                                    |
| `actionItems`   | `string \| null`                                                        | Action items and who is responsible                                                       |
| `nextFollowUp`  | `string \| null`                                                        | Free text; distinct from the organisation's `nextAction`                                  |
| `meetingLink`   | `string \| null`                                                        | Video call or dial-in link; `http`/`https` only                                           |
| `documentLinks` | `string[]`                                                              | Up to 10; `http`/`https` only                                                             |
| `actorUid`      | `string`                                                                | Who recorded it                                                                           |
| `actorLabel`    | `string \| null`                                                        | Their display name or email at the time                                                   |
| `createdAt`     | `Timestamp`                                                             | When the entry was written                                                                |

Links are restricted to `http`/`https` in validation: `z.string().url()` accepts `javascript:` and `data:` URLs, which become an XSS vector once rendered as an anchor.

**Written by:** `changePipelineStage()`, `saveRelationshipManagement()` when advancing a stage, and `logActivity()`.
**Read by:** `listOrganisationActivities()` — newest first, capped at 50.

Entries are never edited or deleted; there is no UI for either.

---

<!-- Add new collection schemas below using the /firebase-collection skill -->
