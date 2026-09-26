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
**Access:** Team-shared — any authenticated team member can read and write through the app. Writes go only through the Server Actions (Admin SDK); the security rules let client SDKs read non-archived organisations and write nothing. See "Security rules" below.

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

**Security rules** (`firebase/firestore.rules`): signed-in users may read organisations whose `deletedAt` is null; client writes are denied. The Server Actions use the Admin SDK, which bypasses rules, so the app is unaffected — denying client writes stops anyone skipping the Zod validation, activity history and soft-delete logic by writing with the client SDK. A client list query must filter on `where('deletedAt', '==', null)`, or Firestore rejects the whole query.

---

## `activities` subcollection

**Path:** `/organisations/{organisationId}/activities/{activityId}`
**Access:** Same as the parent organisation — signed-in users may read, client writes are denied. Rules are matched by path, not inherited, so it has its own nested `match` block. Archived entries stay readable because the timeline lists them for restoring.

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

| `deletedAt` | `Timestamp \| null` | Soft-delete marker for logged activities; `null` when active |

Logged activities can be archived and restored via `setActivityArchived()`; archived entries appear in a collapsed "Archived" section on the timeline. Stage changes cannot be archived — the history would stop matching the organisation's actual stage. Nothing is ever hard-deleted, and entries cannot be edited.

---

## `opportunities` collection

**Path:** `/opportunities/{opportunityId}`
**Access:** Team-shared, same as organisations. **Rules not written yet.**

A specific piece of work with an organisation. Separate from the organisation's own pipeline stage, because one organisation can carry several opportunities at different stages.

| Field              | Type                                            | Required | Description                                                                              |
| ------------------ | ----------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `name`             | `string`                                        | Yes      | Opportunity name                                                                         |
| `organisationId`   | `string`                                        | Yes      | The organisation it belongs to; fixed after creation                                     |
| `organisationName` | `string`                                        | Yes      | Denormalised so the list renders without reading every organisation; refreshed on create |
| `type`             | `'Partnership' \| 'Project' \| 'Collaboration'` | Yes      | From the wireframe's Type column                                                         |
| `stage`            | `PipelineStage`                                 | Yes      | Reuses the organisation pipeline stages rather than a second list                        |
| `owner`            | `string`                                        | Yes      | Assigned team member                                                                     |
| `nextStep`         | `string \| null`                                | Yes      | Expected next step                                                                       |
| `proposalDocument` | `string \| null`                                | Yes      | Link to the proposal; `http`/`https` only                                                |
| `description`      | `string \| null`                                | Yes      | Free text                                                                                |
| `expectedOutcome`  | `string \| null`                                | Yes      | Partnership outcome (expected)                                                           |
| `completedAt`      | `Timestamp \| null`                             | Yes      | Set by "Mark Complete"; `null` while open                                                |
| `createdBy`        | `string`                                        | Yes      | UID of the creating user                                                                 |
| `createdAt`        | `Timestamp`                                     | Yes      | When created                                                                             |
| `updatedAt`        | `Timestamp`                                     | Yes      | When last updated; drives list ordering                                                  |
| `deletedAt`        | `Timestamp \| null`                             | Yes      | Soft-delete marker                                                                       |
| `_schemaVersion`   | `1`                                             | Yes      | Schema version for lazy migration                                                        |

`organisationId` is omitted from the update schema: moving an opportunity between organisations would silently detach it from the contacts and activity history shown beside it.

**Actions:** `listOpportunities()`, `listOpportunitiesForOrganisation(id)`, `getOpportunity(id)`, `createOpportunity()`, `updateOpportunity()`, `setOpportunityComplete()`, `archiveOpportunity()` in `frontend/src/features/opportunities/actions/opportunities.actions.ts`.

---

<!-- Add new collection schemas below using the /firebase-collection skill -->
