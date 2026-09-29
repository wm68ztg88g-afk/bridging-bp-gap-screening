# Programme protocol update: 29 September 2026

## Scope
- Shared classifier: Green ≤135 AND ≤85; Yellow 136–149 OR 86–89; Amber 150–179 OR 90–119; Red ≥180 OR ≥120. Higher band wins.
- Continue existing integer rounding of the average of readings 2 and 3.
- Patient advice matches the latest participant flier, with amber callback within four weeks of screening.
- Emergency wording excludes headache as a standalone listed 999 trigger.
- New submissions save colour bands. No database migration or update of historical records.
- Admin shows current bands calculated from recorded averages, and original category where different. CSV preserves original fields and appends current band/advice/version.
- No automatic calls, alerts, referrals or promises of a red appointment deadline introduced.

## QA inventory
- Unit checks: every threshold boundary and mixed systolic/diastolic bands; exhaustive integer grid; invalid inputs; approved advice.
- Form: consent gate, patient details, all four live band states, mixed values, average rounding, blank/zero input recovery.
- End-to-end: review and save a fictional local record, confirm category and urgent flag from API; add-another resets consent.
- Admin: historical category preserved alongside current band, updated counts, CSV columns, new record advice.
- Visual: 375px mobile and 1280px desktop; amber/red content, review/success, dark mode, horizontal overflow.
- Production: no test submissions or patient-data changes. Deploy via the existing GitHub → Render service; confirm public build after deployment.

## Verification completed
- TypeScript check, production build and all 19 unit tests passed.
- Mobile form showed each of the four bands, including diastolic-only red and amber results.
- A local browser submission using readings 2/3 of 149/89 and 150/90 saved 150/90, Amber, urgent flag false and BMI 27.7 (170 cm / 80 kg). Reading 1 was excluded as intended.
- Consent blocked progression before data entry; starting another screening reset consent.
- Local production-server API saved Green, Yellow and Red test records correctly. Invalid BP and absent agreement (`false`) each returned 422.
- Admin retained old “High-normal” labels while displaying current Yellow bands; CSV retained originals and appended explicit current-band fields.
- Mobile and desktop screenshots inspected, including dark theme, review and success. No mobile document overflow or browser errors found in tested paths.
- All testing used the sandbox's local fictional database, not the Render database.

## Release status
Prepared for the existing Render service. Render deployment and live-build verification remain pending; do not treat a preview or GitHub push as a completed production release.
