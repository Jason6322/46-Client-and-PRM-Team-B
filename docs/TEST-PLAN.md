# Test Plan — FSC CRM

Team 46B · Sprint 3 · Owner: Saneli Ratnayake (Dev)

## Purpose

Ensure that all three implemented epics function correctly on the live website prior to the final presentation. All the testing conducted so far is limited to unit testing using mocked database, which verifies the correctness of the logic but does not confirm the actual behaviour of the deployed application.

This document covers manual testing of the running application. Automated testing and instructions on how to conduct it are covered separately in `docs/TESTING.md`.

## Scope

In scope:

- Epic 1 — organisations and stakeholders
- Epic 2 — relationship management fields
- Epic 3 — twelve stage relationship pipeline
- Login and access control, since every other test depends on it

Out of scope:

- User testing with real participants, which is tracked separately.
- Performance testing. As there are no performance requirements for this project.
- Browser compatibility testing beyond Chrome.

## Environment

| Item        | Detail                                                |
| ----------- | ----------------------------------------------------- |
| Application | Deployed build on Vercel                              |
| Database    | Firestore (project data, not a separate test project) |
| Browser     | Chrome, latest                                        |
| Account     | Existing team account with normal user access         |

Testing is conducted against the deployed website rather than a local build, as the deployed application is what will be assessed by the client and the marker. A few numbers of test cases cannot be verified through the UI, such as confirming records are still preserved and verifying stage history. These cases are therefore tested through API responses and are marked accordingly

## Approach

Each test case includes test steps and expected result. Each test case is recorded as either pass or fail when executed. For every failed test, a defect report is created with sufficient information to reproduce the defect without having to execute the entire test case again.

Tests are organized by epic and executed in sequence, as later tests depend on records created by earlier tests. The organizational structure created in ORG-01 is used throughout the testing process

## Entry criteria

- All deployed website loads correctly and login functions as expected
- All three epics have been merged into the main

## Exit criteria

- All test cases have been executed and recorded as either pass or fail
- All failed test cases have been documented in defects log
- Any issues that could affect the final demo are cause problems with the final demo are designated as high priority and communicated to the dev who owns the feature

## Defect severity

| Level    | Meaning                                        |
| -------- | ---------------------------------------------- |
| Priority | Blocks a core flow or would break the demo     |
| Major    | Feature works but gives a wrong result         |
| Minor    | Cosmetic, or a small gap that has a workaround |

## Risks

- Testing against the live Firestore project may result in test data remaining in the database. Test records are labelled with `TEST` so that they may be identified and archived later.
- Pipeline history cannot be viewed through the user interface, so the corresponding tests depend on API response for verification
