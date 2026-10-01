# EMHIP enrolment field

## Change
- Required Yes/No at the end of patient details, before BP entry; neither answer preselected.
- Review shows the answer; resetting for another participant clears it.
- API requires a real boolean. Database adds a nullable column without a default or backfill.
- Existing records remain null, labelled Not recorded.
- Admin displays each answer and separate Yes/No/Not recorded screening-record totals (not unique people).
- CSV appends `enrolledWithEmhip` as Yes/No/Not recorded without shifting existing columns.
- No change to BP thresholds, advice, consent or existing patient data.

## QA checklist
- TypeScript, production build, existing BP tests and EMHIP unit tests.
- Additive migration on existing local test database; compare all pre-existing fields before/after.
- Mobile form: unanswered blocks continuation; Yes/No mutually exclusive; back/next preserves the choice.
- Review and save Yes; save No; verify API/admin/CSV; new patient has no preselection.
- Reject omitted/null/string values; explicit false remains No.
- Desktop/mobile screenshots; dark theme; page overflow; no browser errors.
- Local tests only. Existing Render service requires deployment after the GitHub commit; preview is not production.

## Verification: 1 October 2026
- TypeScript and production build passed; all 22 unit tests passed.
- Migration on the local test database left every prior field unchanged and every historical EMHIP value null.
- Mobile UI blocked an unanswered field, kept Yes/No mutually exclusive, and preserved the answer through back/next.
- Complete mobile submission saved Yes and showed it on review. Starting another record reset both consent and EMHIP selection.
- Production-build API saved No as false, and returned 422 for omitted, null and string answers.
- Admin showed correct Yes/No/Not recorded totals and row labels; CSV appended all three labels correctly.
- Desktop/mobile and dark screenshots inspected; mobile admin has no page overflow. No browser errors occurred.
- No production patient records accessed or modified during testing.
