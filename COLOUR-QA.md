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

## Green wording clarification
On 1 October 2026 the clinical lead requested encouraging green advice that covers maintaining a healthy lifestyle and monitoring, with medication advice only for people already taking it. Green now says: “Good news! Your blood pressure is in the green range today. Keep up a healthy lifestyle to help it stay that way, and monitor your blood pressure regularly. If you take blood pressure medication, continue it as prescribed.”
The shared definition feeds form/review/success, admin advice and CSV current advice. No thresholds or saved measurements changed.

## Further advice revisions: 1 October 2026
- Green encouragement/lifestyle/conditional medication text retained.
- Yellow: “Make an appointment with your GP within 1 month.”
- Amber: SGH callback within four weeks of screening to arrange an appointment at St George’s Hospital; also make a GP appointment within four weeks.
- Red: SGH team to contact the participant to arrange an urgent appointment in the next 24–48 hours at St George’s Hospital. This is the clinical lead's new explicit wording, superseding the earlier no-numeric-deadline wording.
- The SGH definition is displayed on Amber/Red only. The non-diagnostic screening note stays on all bands.
- BP thresholds, emergency-symptom override and mandatory EMHIP capture unchanged.
- Readability: 16px action text, separate paragraphs and bold timeframes; exact shared wording also used to generate updated printed staff pathway and flowchart.
- Verification: all four displayed advice strings matched the shared source; SGH definition present only for Amber/Red; expected deadlines bold; CSV current advice matched; no mobile horizontal overflow or browser errors.
