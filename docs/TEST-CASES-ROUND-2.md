# Test Cases — Round 2

Features added at the end of sprint 3 week 1, plus the cases affected by the client changes.
Run against the deployed site on 14–15 October 2026.

Team 46B · Sprint 3 week 2 · Owner: Saneli Ratnayake (Dev)

**Result: 34 run, 32 pass, 1 fail then fixed and re-tested, 1 not reliably testable.
2 defects raised, 1 of them Priority.**

**Safety note.** The permanent delete destroys data, including an organisation's activity
history and its linked opportunities. Every DEL case below used a record created for testing
and named with the `TEST` prefix. No client or demo record was deleted.

---

## Permanent delete

Setup: `TEST Delete Me` was created with a primary contact, two tags, a note, two stage
moves and one linked opportunity, then archived.

| ID      | Title                                     | Steps                                                                             | Expected result                                                          | Result                                                                                                                                                                                                            |
| ------- | ----------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEL-01  | Delete is not offered on an active record | Open the record while it is active                                                | No permanent delete action is available                                  | Pass — only Archive and Edit Organisation are offered                                                                                                                                                             |
| DEL-02  | Delete is offered once archived           | Archive the record, open the Archived page                                        | A Delete permanently action is shown                                     | Pass                                                                                                                                                                                                              |
| DEL-03  | Confirmation step appears                 | Click Delete permanently                                                          | A confirmation step appears and nothing is deleted until it is confirmed | **Fail on 14 Oct** — deleted immediately on one click, see DEF-06. **Re-tested 15 Oct after the fix: Pass** — a dialog now names the organisation, states what will be removed, and requires the name to be typed |
| DEL-03b | Confirmation refuses a wrong name         | Type a name that does not match, then try to confirm                              | Deletion is refused                                                      | Pass — the confirm button is disabled until the name matches                                                                                                                                                      |
| DEL-04  | Cancelling leaves the record intact       | Start the delete, then cancel                                                     | Record is still listed with its details unchanged                        | Pass                                                                                                                                                                                                              |
| DEL-05  | Confirming removes the record             | Confirm the delete                                                                | Record disappears from the Archived page and the organisations list      | Pass                                                                                                                                                                                                              |
| DEL-06  | Deleted record is not reachable by URL    | Open the organisation's URL, saved before deleting                                | Not found, rather than a blank page or an error screen                   | Pass — a 404 page with a link back                                                                                                                                                                                |
| DEL-07  | Linked opportunity is removed             | Open the linked opportunity's URL, saved before deleting                          | The opportunity is gone                                                  | Pass — 404. Cascade confirmed                                                                                                                                                                                     |
| DEL-08  | Activity history is removed               | Check the dashboard Recent Activity feed                                          | No entries remain for the deleted organisation                           | Pass                                                                                                                                                                                                              |
| DEL-09  | Dashboard counts update                   | Compare the Active Organisations and Active Opportunities counts before and after | Both counts drop                                                         | Not reliably testable — the counts changed independently during the test window as other team members added, archived and deleted records, so the before and after cannot be attributed to the delete             |

## Search and filter

| ID      | Title                          | Steps                                                      | Expected result                                                      | Result                                                           |
| ------- | ------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| SRCH-01 | Open the search page           | Click the search button in the top navigation              | The Search and Filter page opens                                     | Pass                                                             |
| SRCH-02 | Search by organisation name    | Search part of a known organisation name                   | That organisation is returned                                        | Pass                                                             |
| SRCH-03 | Search by contact name         | Search a contact's first name, surname and full name       | The organisation that contact belongs to is returned in each case    | Pass — `Zoe`, `Kaur` and `Zoe Kaur` all return Darling Downs Co. |
| SRCH-04 | Search by tag                  | Search a tag used by more than one organisation            | Every organisation with that tag is returned                         | Pass — `indigenous-led` returned 6                               |
| SRCH-05 | Search with no matches         | Search a string that matches nothing                       | An empty state is shown, not an error                                | Pass                                                             |
| SRCH-06 | Filter by pipeline stage       | Filter by Prospect                                         | Only Prospect organisations, and the count matches the list overview | Pass                                                             |
| SRCH-07 | Combine a search with a filter | Search `food` with organisation type Client                | Results satisfy both conditions                                      | Pass — 4 results, all Clients matching food by name or industry  |
| SRCH-08 | Filters survive a reload       | Apply a search and a filter, then refresh                  | Same results, filters still applied                                  | Pass                                                             |
| SRCH-09 | A filtered view can be shared  | Copy the page address while filtered, open it in a new tab | The same filtered view loads                                         | Pass                                                             |
| SRCH-10 | Archived records are excluded  | Search for an archived organisation                        | It is not returned among the active results                          | Pass                                                             |

## Meetings calendar

| ID     | Title                                     | Steps                                                         | Expected result                                 | Result                                                                                                          |
| ------ | ----------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| CAL-01 | Calendar is available                     | Open the Meetings area                                        | A calendar is shown                             | Pass — note it is on an organisation's Meetings page, not on the Meetings index, which lists organisations only |
| CAL-02 | A logged meeting appears on its date      | Log a meeting for a specific date                             | The meeting appears on that date                | Pass for the date — but the time is wrong, see DEF-07                                                           |
| CAL-03 | Selecting a day filters the list          | Click a day that has a meeting                                | The list shows that day's meetings              | Pass                                                                                                            |
| CAL-04 | Selecting an empty day                    | Click a day with no meetings                                  | An empty state is shown                         | Pass — "No meetings booked — free all day"                                                                      |
| CAL-05 | Meetings for every organisation are shown | Check meetings belonging to more than one organisation appear | The calendar is not limited to one organisation | Pass — the legend distinguishes this organisation's meetings from any organisation's                            |

## Opportunity detail page

| ID     | Title                                           | Steps                                                        | Expected result                                            | Result |
| ------ | ----------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ------ |
| OPP-01 | Opportunity opens on its own page               | Click an opportunity from the Opportunities list             | It opens on its own page                                   | Pass   |
| OPP-02 | Details are shown                               | Read the page                                                | Details shown with related contacts, meetings and activity | Pass   |
| OPP-03 | Link from the dashboard                         | Open an opportunity from the dashboard                       | Lands on the same detail page                              | Pass   |
| OPP-04 | Link from the organisation profile              | Open an opportunity from an organisation's Opportunities tab | Lands on the same detail page                              | Pass   |
| OPP-05 | Link after creating one                         | Create an opportunity                                        | Lands on the new opportunity's detail page                 | Pass   |
| OPP-06 | Opportunity is linked to the right organisation | Check the organisation shown                                 | Matches the organisation it was raised against             | Pass   |

## Re-runs after the client changes

| ID      | Title                                    | Steps                                                      | Expected result                                        | Result                                                               |
| ------- | ---------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| REL-03b | Lead priority has four levels            | Open the Lead priority dropdown                            | Urgent, High, Medium and Low are available             | Pass — plus a Not set option                                         |
| REL-03c | Urgent sorts first                       | Set an organisation to Urgent, open the Relationships page | Urgent appears ahead of High, Medium and Low           | Pass — the page orders Urgent, then High, then Medium                |
| ORG-11b | Archived records are kept until deleted  | Open the Archived page                                     | No scheduled removal date and the 30 day claim is gone | Pass — DEF-01 confirmed fixed                                        |
| ORG-02b | Relationship owner is no longer required | Add an organisation without setting an owner               | Saves without a validation error                       | Pass — saved as Unassigned. A primary contact name is still required |

## Cleanup

Test records created during this round were archived afterwards. `TEST Delete Me` and its
opportunity were destroyed as part of DEL-05, which was the purpose of that record.
