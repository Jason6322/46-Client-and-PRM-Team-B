# Defect Log - FSC CRM

Team 46B · Sprint 3 · Owner: Saneli Ratnayake (Dev)

One row per failed or partially failed test case. Severity is Priority, Major or Minor as
defined in the test plan. Raised from the manual run on 7–8 October 2026.

| ID     | Test case | Severity | What happened                                                                                                                                                                                                                                                                       | Expected                                                                                                                                                             | Steps to reproduce                                                                                                       | Status                                                                                                                                                             |
| ------ | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DEF-01 | ORG-11    | Minor    | The Archived page shows a "Scheduled removal" date for every record and states archived records are kept for 30 days, but no automated removal exists. The footer on the same page confirms nothing is removed automatically.                                                       | Either records are removed on the scheduled date or the column and the 30 day claim are reworded so they do not promise automatic deletion.                          | Archive an organisation, open Organisations > Archived, read the Scheduled removal column and the footer note.           | Fixed - the client asked for archived records to be kept until deleted, so the 30 day removal was dropped and a Delete permanently action added. Needs re-testing. |
| DEF-02 | PIP-06    | Minor    | A stage change cannot assign an owner. The move form offers only a next action and a due date. The data model records an assigned owner against every transition and the UX design included assigning an owner on a move.                                                           | The stage change form lets the user assign an owner, stored against that transition in the history.                                                                  | Open an organisation, change the pipeline stage, observe the form has no owner field.                                    | Won't fix - client decided ownership is handled separately.                                                                                                        |
| DEF-03 | PIP-07    | Major    | A stage change cannot record a note and the next action is saved as current state on the organisation, editable afterwards through "Edit follow-up", rather than against the transition. The history entry records only the from stage, to stage, who and when.                     | Each stage change records its own note and next action as part of that transition, so the history shows why each move happened and earlier entries cannot be edited. | Change an organisation's pipeline stage, enter a next action, save, then read the Activity Timeline entry for that move. | Open                                                                                                                                                               |
| DEF-04 | REL-01    | Minor    | Exceeding the Research status length shows the raw validation message "String must contain at most 100 character(s)". Other forms show plain messages such as "Enter a valid link", so validation wording is inconsistent across the app.                                           | A plain message in the same style as the rest of the app, for example "Research status must be 100 characters or fewer".                                             | Open Relationship Management, type more than 100 characters into Research status, save.                                  | Open                                                                                                                                                               |
| DEF-05 | ORG-01    | Minor    | Relationship owner was removed from the Add Organisation form at the client's request, so new organisations are created as "Unassigned" with nothing prompting anyone to assign an owner. Unclear ownership of relationships was one of the problems the CRM was intended to solve. | Either an owner is assigned on creation or unassigned organisations are surfaced somewhere so they can be picked up.                                                 | Add a new organisation, open its profile, read Relationship Owner.                                                       | Won't fix - the client asked for the owner to be optional and the Owner column removed from the list pages. Raised as a risk rather than a bug.                    |

## Summary

| Severity | Count |
| -------- | ----- |
| Priority | 0     |
| Major    | 1     |
| Minor    | 4     |

| Status                      | Count |
| --------------------------- | ----- |
| Open                        | 2     |
| Fixed                       | 1     |
| Won't fix - client decision | 2     |

No defect blocks the core user journey, so the product is demonstrable as it stands.
DEF-03 is the most significant still open: the pipeline history records who moved an
organisation and when, but not why, which is the question the history was added to answer.

## Still to test

The following were added after this run and are not yet covered by any test case:

- Delete permanently, which also removes the organisation's activity history and linked
  opportunities. This is the only action in the application that destroys data, so it needs
  cases of its own covering the confirmation step, the refusal on a record that is not
  archived, and the cascade.
- The Search and Filter page
- The meetings calendar
- The opportunity detail page
- Lead priority now has four levels rather than three, so REL-03 needs re-running
