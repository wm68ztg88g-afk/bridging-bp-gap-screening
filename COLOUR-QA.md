# BP band colour update: 1 October 2026

## Scope
- Distinct green, yellow, orange-amber and red result backgrounds, thicker left border and solid text-labelled badges.
- The same badge component is used in screening results and admin records.
- No BP thresholds, advice, EMHIP behaviour, stored records or API changes.

## Verification checklist
- TypeScript, production build and all existing tests.
- Four actual result panels with test readings, checked in light and dark themes.
- Computed text/background contrast of result body and badges at least 4.5:1.
- Desktop/mobile screenshots, no horizontal overflow; badge labels and advice preserved.
- Admin uses the same computed badge colours.
- No production patient-data access or test submissions.

## Results
- TypeScript and production build passed; all 22 unit tests passed.
- All four actual result panels inspected in light and dark themes.
- Lowest measured text contrast was 5.02:1 on the green badge; all tested body and badge text exceeded 4.5:1.
- Admin badge background/text colours match the corresponding form badge exactly.
- Mobile form had no horizontal page overflow; no browser errors observed.
- EMHIP field remains mandatory before moving beyond patient details. CSV retains the separate Yes/No/Not recorded column added in the preceding commit.
- Ready for deployment to the existing Render service, together with the EMHIP update.
