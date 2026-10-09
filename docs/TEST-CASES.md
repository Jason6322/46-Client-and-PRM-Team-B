# Test Cases - FSC CRM

Team 46B · Sprint 3 · Owner: Saneli Ratnayake (Dev)

Run against the deployed site on 7–8 October 2026, signed in as a normal team member.
Cases run in order, reusing the organisation created in ORG-01.

**Result: 36 run, 33 pass, 1 partial, 1 fail, 2 not applicable. 5 defects logged in DEFECT-LOG.md.**

---

## Access

| ID      | Title                                    | Steps                                                      | Expected result                                | Result                                                                                          |
| ------- | ---------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| AUTH-01 | Protected page redirects when signed out | Sign out, then open the organisations page directly by URL | Redirected to login, organisations not shown   | Pass                                                                                            |
| AUTH-02 | Login with valid account                 | Sign in with a team account                                | Lands on the dashboard, signed in              | Pass                                                                                            |
| AUTH-03 | Login with wrong password                | Sign in with a valid email and a wrong password            | Rejected with an error message, stays on login | Pass - message is "Invalid email or password", which does not reveal whether the account exists |
| AUTH-04 | Session persists on refresh              | While signed in, refresh the page                          | Still signed in, not sent back to login        | Pass                                                                                            |

## Epic 1 - Organisations and stakeholders

| ID     | Title                                  | Steps                                                                      | Expected result                                       | Result                                                                                                          |
| ------ | -------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| ORG-01 | Create an organisation                 | Add a new organisation named `TEST GreenLeaf Foods`, type Industry Partner | Saved, appears in the organisation list               | Pass - see DEF-05 on the owner                                                                                  |
| ORG-02 | Required fields enforced               | Try to save a new organisation with the name left blank                    | Blocked with a validation message, nothing saved      | Pass - per-field messages on name, country and owner                                                            |
| ORG-03 | Invalid website rejected               | Create an organisation with website `notaurl`                              | Blocked with a validation message                     | Pass - "Enter a valid link"                                                                                     |
| ORG-04 | Invalid email rejected                 | Add a contact with email `notanemail`                                      | Blocked with a validation message                     | Pass - "Enter a valid email"                                                                                    |
| ORG-05 | Organisation list shows records        | Open the organisations list                                                | Listed with type, contact, owner, stage and tags      | Pass - at time of testing. The Owner column has since been removed from the list pages at the client's request. |
| ORG-06 | Open the organisation profile          | Click the organisation                                                     | Profile opens showing the details entered in ORG-01   | Pass                                                                                                            |
| ORG-07 | Edit a single field                    | Change the industry only, save, reopen                                     | Industry updated, every other field unchanged         | Pass - website, owner, tags, contact, notes and stage history all intact                                        |
| ORG-08 | Add a contact                          | Add a contact with name, role, email, phone, marked primary                | Contact appears on the profile and is marked primary  | Pass                                                                                                            |
| ORG-09 | Add tags and notes                     | Add three tags and a note, save, reopen                                    | Tags and note are shown                               | Pass                                                                                                            |
| ORG-10 | Archive an organisation                | Archive the organisation                                                   | Removed from the default list                         | Pass                                                                                                            |
| ORG-11 | Archived record is kept, not destroyed | Open Organisations > Archived                                              | Record is listed with its details and can be restored | Pass - see DEF-01 on the scheduled removal date                                                                 |
| ORG-12 | Restore an archived organisation       | Restore the record from the Archived page                                  | Appears in the list again with its details intact     | Pass                                                                                                            |

## Epic 2 - Relationship management

Uses TEST GreenLeaf Foods, restored in ORG-12.

| ID     | Title                                          | Steps                                                            | Expected result                                                   | Result                                                                                                                                                                            |
| ------ | ---------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REL-01 | Record research information                    | Enter business research notes and research status, save, reopen  | Both saved and shown                                              | Pass - see DEF-04 on the validation wording                                                                                                                                       |
| REL-02 | Record a business brief and qualification info | Enter both, save, reopen                                         | Saved and shown                                                   | Pass                                                                                                                                                                              |
| REL-03 | Set a lead priority                            | Set Lead priority to High, save, reopen                          | Saved and shown as High on the profile and the relationship tab   | Pass                                                                                                                                                                              |
| REL-04 | Lead score rejects out of range                | Set the lead score to 150                                        | Blocked with a validation message                                 | Not applicable - superseded when the numeric lead score was replaced with a priority dropdown, which cannot take an invalid value                                                 |
| REL-05 | Lead score rejects text                        | Set the lead score to `abc`                                      | Blocked with a validation message                                 | Not applicable - as above                                                                                                                                                         |
| REL-06 | Record outreach and follow-up                  | Enter outreach status, communication record and follow-up status | All three saved and shown                                         | Pass                                                                                                                                                                              |
| REL-07 | Record next action and due date                | Enter a next action with a due date                              | Both saved and shown                                              | Pass                                                                                                                                                                              |
| REL-08 | Partial update does not wipe other fields      | Change only the follow-up status, save, reopen                   | Follow-up status updated, all other relationship fields unchanged | Pass - research notes, qualification info, lead priority, research status, business brief, outreach status, communication record, next action and relationship notes all survived |
| REL-09 | Relationship data stays with its organisation  | Create `TEST Northside Grocers` and open its relationship tab    | Its relationship fields are empty, not the other organisation's   | Pass                                                                                                                                                                              |
| REL-10 | Relationship notes saved                       | Add relationship notes, save, reopen                             | Notes shown                                                       | Pass                                                                                                                                                                              |

## Epic 3 - Relationship pipeline

| ID     | Title                                                         | Steps                                           | Expected result                                                      | Result                                                                                                                      |
| ------ | ------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| PIP-01 | All twelve stages available                                   | Open the stage selector                         | Twelve stages listed, Prospect through to Archived                   | Pass - order matches the agreed stage list                                                                                  |
| PIP-02 | Move an organisation forward a stage                          | Move from Prospect to Research                  | Stage shows as Research on the profile and the board                 | Pass                                                                                                                        |
| PIP-03 | Move through several stages                                   | Research to Qualified, then to Outreach         | Each move saves and the current stage is correct                     | Pass                                                                                                                        |
| PIP-04 | Move backwards                                                | Move from Outreach back to Research             | Allowed, stage shows as Research                                     | Pass                                                                                                                        |
| PIP-05 | Selecting the current stage does not create a duplicate entry | Select the stage the organisation is already on | No change is saved and no new history entry is created               | Pass - handled in the interface as a no-op, so the backend conflict rule is not reachable from the UI                       |
| PIP-06 | Assign an owner on a move                                     | Change stage and set a different owner          | Stage and owner both updated and recorded against the move           | **Fail at time of testing** - the move form has no owner field. Since closed as a client decision, see DEF-02               |
| PIP-07 | Note and next action saved on a move                          | Change stage with a note and a next action      | Both stored against that transition                                  | **Partial** - see DEF-03, no note field exists and the next action is stored on the organisation rather than the transition |
| PIP-08 | History records every move                                    | Read the Activity Timeline after several moves  | One entry per move, each with from stage, to stage, who and when     | Pass                                                                                                                        |
| PIP-09 | History is append only                                        | Make another move and re-read the timeline      | New entry added, earlier entries unchanged                           | Pass - entries from the previous day were still present and unaltered                                                       |
| PIP-10 | Board reflects the current stage                              | Open the Pipeline board                         | The organisation appears under its current stage only                | Pass                                                                                                                        |
| PIP-11 | Stage survives a refresh                                      | Refresh the page after a move                   | Stage is unchanged                                                   | Pass                                                                                                                        |
| PIP-12 | Archived stage behaves correctly                              | Move to the Archived stage                      | Stage shows Archived, record still reachable from the list and board | Pass - the Archived stage and the archived record state are independent, as designed                                        |

## Cleanup

| ID     | Title            | Steps                                                   | Expected result                         | Result |
| ------ | ---------------- | ------------------------------------------------------- | --------------------------------------- | ------ |
| CLN-01 | Remove test data | Archive every organisation named with the `TEST` prefix | No test records left in the active list | Pass   |

---

## Notes from the run

- The relationship fields were tested after the numeric lead score was replaced with a
  priority dropdown and the relationship owner was removed from the Add Organisation form.
  REL-03 was rewritten and REL-04 and REL-05 were retired as a result.
- Several records with placeholder names (`test`, `Test`, `Testt`, `temp`, `qweqwe`) are
  visible in the organisation list and on the pipeline board. Not a defect, but worth
  clearing before the client demo.

## Changes since this run

Several client-requested changes landed on 8 and 9 October, after these cases were run.
The results above describe the build as it stood on 7 and 8 October. The following need
re-running or extending:

- Lead priority now has four levels (Urgent, High, Medium, Low) rather than three, so
  REL-03 needs re-running.
- Archived records are now kept until deleted rather than removed after 30 days, and a
  permanent delete was added, so ORG-11 needs re-running.
- The relationship owner is no longer required and the Owner column has been removed from
  the list pages, which affects ORG-02 and ORG-05.
- Not yet covered by any case: the Search and Filter page, the meetings calendar, the
  opportunity detail page, and the permanent delete. The permanent delete is the only
  action in the application that destroys data, including the organisation's activity
  history and linked opportunities, so it needs cases of its own.
