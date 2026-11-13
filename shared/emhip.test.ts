import assert from "node:assert/strict";
import { test } from "node:test";
import { insertScreeningSchema } from "./schema";
import { countEmhip, emhipLabel } from "./emhip";

const base = {
  volunteerCode: "X", screeningDate: "2026-11-13", patientName: "Test", dob: "1970-01-01", sex: "Female",
  ethnicity: "Prefer not to say", postcode: "SW17", phone: "07700900000", altContact: null, noContactRoute: false,
  interpreterNeeded: false, registeredWithGp: false, gpPractice: null,
  bp1Systolic: 120, bp1Diastolic: 80, bp2Systolic: 120, bp2Diastolic: 80, bp3Systolic: 120, bp3Diastolic: 80,
  heightMethod: "Declined", weightMethod: "Declined", heightCm: null, weightKg: null, waistCm: null, waistDeclined: true,
  knownHypertension: false, smokingStatus: "Never smoked", familyHistoryHtn: false, consentToContact: true,
  symptomsReported: false, pregnant: false, lastBpCheck: "Never", checkedBefore: "No",
};
test("EMHIP answer is required at the EMHIP hub and absent elsewhere", () => {
  const at = (hubLocation: string, enrolledWithEmhip: unknown) =>
    insertScreeningSchema.safeParse({ ...base, hubLocation, enrolledWithEmhip }).success;
  assert.equal(at("EMHIP hub", true), true);
  assert.equal(at("EMHIP hub", false), true);
  for (const v of [null, undefined, "yes", 0]) assert.equal(at("EMHIP hub", v), false);
  assert.equal(at("Mushkil Aasaan", null), true);
  assert.equal(at("Mushkil Aasaan", true), false);
});
test("participants must be 18 or over; GP practice required when registered", () => {
  assert.equal(insertScreeningSchema.safeParse({ ...base, hubLocation: "X", enrolledWithEmhip: null, dob: "2015-01-01" }).success, false);
  assert.equal(insertScreeningSchema.safeParse({ ...base, hubLocation: "X", enrolledWithEmhip: null, registeredWithGp: true, gpPractice: "" }).success, false);
  assert.equal(insertScreeningSchema.safeParse({ ...base, hubLocation: "X", enrolledWithEmhip: null, registeredWithGp: true, gpPractice: "Tooting Practice" }).success, true);
});
test("declined measurements must have no value", () => {
  assert.equal(insertScreeningSchema.safeParse({ ...base, hubLocation: "X", enrolledWithEmhip: null, weightKg: 70 }).success, false);
});
test("EMHIP labels keep historical missing values separate from No", () => {
  assert.equal(emhipLabel(true), "Yes");
  assert.equal(emhipLabel(false), "No");
  assert.equal(emhipLabel(null), "Not recorded");
  assert.equal(emhipLabel(undefined), "Not recorded");
});
test("EMHIP totals count records and retain the unknown denominator", () => {
  assert.deepEqual(countEmhip([]), { yes: 0, no: 0, notRecorded: 0 });
  assert.deepEqual(countEmhip([
    { enrolledWithEmhip: true }, { enrolledWithEmhip: true },
    { enrolledWithEmhip: false }, { enrolledWithEmhip: null }, {},
  ]), { yes: 2, no: 1, notRecorded: 2 });
});
