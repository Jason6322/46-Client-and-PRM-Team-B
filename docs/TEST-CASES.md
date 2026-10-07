# Test Cases — FSC CRM

Team 46B · Sprint 3 · Owner: Saneli Ratnayake (Dev)

Run in order. Later cases use the organisation created in ORG-01.
Fill in Result as Pass or Fail and raise a defect for anything that fails.

---

## Access

| ID      | Title                                    | Steps                                                      | Expected result                                | Result |
| ------- | ---------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- | ------ |
| AUTH-01 | Protected page redirects when signed out | Sign out, then open the organisations page directly by URL | Redirected to login, organisations not shown   |        |
| AUTH-02 | Login with valid account                 | Sign in with a team account                                | Lands on the dashboard, signed in              |        |
| AUTH-03 | Login with wrong password                | Sign in with a valid email and a wrong password            | Rejected with an error message, stays on login |        |
| AUTH-04 | Session persists on refresh              | While signed in, refresh the page                          | Still signed in, not sent back to login        |        |

## Epic 1 — Organisations and stakeholders

| ID     | Title                              | Steps                                                                                     | Expected result                                                 | Result |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| ORG-01 | Create an organisation             | Add a new organisation named `TEST GreenLeaf Foods`, type Industry Partner, with an owner | Saved, successfully and displayed in the organisation list      |        |
| ORG-02 | Required fields enforced           | Try to save a new organisation with the name left blank                                   | Blocked by validation with an error message, no record is saved |        |
| ORG-03 | Invalid website rejected           | Create an organisation with website `notaurl`                                             | Blocked with a validation message                               |        |
| ORG-04 | Invalid email rejected             | Add a contact with email `notanemail`                                                     | Blocked with a validation message                               |        |
| ORG-05 | Organisation list shows records    | Open the organisations list                                                               | TEST GreenLeaf Foods is listed with its type and owner          |        |
| ORG-06 | Open the organisation profile      | Click TEST GreenLeaf Foods                                                                | Profile opens showing the details entered in ORG-01             |        |
| ORG-07 | Edit a single field                | Change the industry only, save, reopen                                                    | Industry updated, every other field unchanged                   |        |
| ORG-08 | Add a contact                      | Add a contact with name, role, email, phone, marked primary                               | Contact appears on the profile and is marked primary            |        |
| ORG-09 | Add tags and notes                 | Add two tags and a note, save, reopen                                                     | Both tags and the note are shown                                |        |
| ORG-10 | Archive an organisation            | Archive TEST GreenLeaf Foods                                                              | Removed from the default list                                   |        |
| ORG-11 | Archived record still exists (API) | Fetch the organisation by ID from the API                                                 | Record returned with `deletedAt` set, not permanently deleted   |        |
| ORG-12 | Restore an archived organisation   | Unarchive the record                                                                      | Appears in the list again with its details intact               |        |

## Epic 2 — Relationship management

Uses TEST GreenLeaf Foods, restored in ORG-12.

| ID     | Title                                         | Steps                                                             | Expected result                                                               | Result |
| ------ | --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------ |
| REL-01 | Record research information                   | Enter research info and research status, save, reopen             | Both saved and shown                                                          |        |
| REL-02 | Record a business brief                       | Enter a business brief, save, reopen                              | Saved and shown                                                               |        |
| REL-03 | Set a lead score                              | Set the lead score to 60                                          | Saved and shown as 60                                                         |        |
| REL-04 | Lead score rejects out of range               | Set the lead score to 150                                         | Blocked with a validation message                                             |        |
| REL-05 | Lead score rejects text                       | Set the lead score to `abc`                                       | Blocked with a validation message                                             |        |
| REL-06 | Record outreach and follow-up                 | Enter outreach status, communication record and follow-up status  | All three saved and shown                                                     |        |
| REL-07 | Record next action and due date               | Enter a next action with a due date                               | Both saved and shown                                                          |        |
| REL-08 | Partial update does not wipe other fields     | Change only the follow-up status, save, reopen                    | Follow-up status updated, research info, lead score and next action unchanged |        |
| REL-09 | Relationship data stays with its organisation | Create a second organisation `TEST Northside Grocers` and open it | Its relationship fields are empty, not GreenLeaf's                            |        |
| REL-10 | Relationship notes saved                      | Add relationship notes, save, reopen                              | Notes shown                                                                   |        |

## Epic 3 — Relationship pipeline

| ID     | Title                                   | Steps                                           | Expected result                                                     | Result |
| ------ | --------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | ------ |
| PIP-01 | All twelve stages available             | Open the stage selector on TEST GreenLeaf Foods | All twelve stages listed, Prospect through to Archived              |        |
| PIP-02 | Move an organisation forward a stage    | Move from Prospect to Research                  | Stage shows as Research on the profile and the board                |        |
| PIP-03 | Move through several stages             | Move Research to Qualified, then to Outreach    | Each move saves and the current stage is correct                    |        |
| PIP-04 | Move backwards                          | Move from Outreach back to Research             | Allowed, stage shows as Research                                    |        |
| PIP-05 | Moving to the current stage is rejected | Move to Research while already on Research      | Rejected with a message, nothing recorded                           |        |
| PIP-06 | Assign an owner on a move               | Move to Meeting and set a different owner       | Stage and owner both updated on the profile                         |        |
| PIP-07 | Note and next action saved on a move    | Move to Proposal with a note and a next action  | Both stored against that move                                       |        |
| PIP-08 | History records every move (API)        | Fetch the organisation and read `stageHistory`  | One entry per move, each with from stage, to stage, who, when       |        |
| PIP-09 | History is append only (API)            | Make another move and refetch                   | New entry added, earlier entries unchanged                          |        |
| PIP-10 | Board reflects the current stage        | Open the pipeline board                         | TEST GreenLeaf Foods appears under its current stage only           |        |
| PIP-11 | Stage survives a refresh                | Refresh the page after a move                   | Stage is unchanged                                                  |        |
| PIP-12 | Archive stage behaves correctly         | Move to Archived                                | Stage shows Archived, record still reachable from the board or list |        |

## Cleanup

| ID     | Title            | Steps                                                   | Expected result                         | Result |
| ------ | ---------------- | ------------------------------------------------------- | --------------------------------------- | ------ |
| CLN-01 | Remove test data | Archive every organisation named with the `TEST` prefix | No test records left in the active list |        |
