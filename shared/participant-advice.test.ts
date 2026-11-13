import { test } from "node:test";
import assert from "node:assert/strict";
import {
  participantAdvice, needsContactRoute, ageOn, ftInToCm, stLbToKg, isAbovePregnancyThreshold,
  MATERNITY_ADVICE, PREGNANT_IN_RANGE_ADVICE, isRedNoContact, isNoContactFlag, NO_CONTACT_ADVICE, GP_CONTACT_ADVICE, NOT_REGISTERED_ADVICE,
} from "./participant-advice";
import { BP_ADVICE_PARAGRAPHS } from "./bp-protocol";

test("pregnancy threshold is strictly above 135/85 on either reading", () => {
  assert.equal(isAbovePregnancyThreshold(135, 85), false);
  assert.equal(isAbovePregnancyThreshold(136, 70), true);
  assert.equal(isAbovePregnancyThreshold(120, 86), true);
});

test("pregnant above threshold gets maternity advice, whatever the band", () => {
  for (const [s, d] of [[136, 80], [150, 95], [185, 125]]) {
    const r = participantAdvice({ systolic: s, diastolic: d, pregnant: true });
    assert.equal(r.pathway, "Maternity");
    assert.deepEqual(r.paragraphs, MATERNITY_ADVICE);
  }
});

test("pregnant at or below 135/85 gets in-range advice", () => {
  const r = participantAdvice({ systolic: 135, diastolic: 85, pregnant: true });
  assert.equal(r.pathway, "PregnantInRange");
  assert.deepEqual(r.paragraphs, PREGNANT_IN_RANGE_ADVICE);
  assert.equal(r.band, "Green");
});

test("no contact route: amber books GP, red goes to SGH A&E; yellow unchanged", () => {
  assert.equal(participantAdvice({ systolic: 160, diastolic: 80, noContactRoute: true }).pathway, "NoContactRoute");
  const red = participantAdvice({ systolic: 185, diastolic: 80, noContactRoute: true });
  assert.equal(red.pathway, "NoContactRoute");
  assert.deepEqual(red.paragraphs, NO_CONTACT_ADVICE.Red);
  assert.match(red.advice, /A&E at St George/);
  assert.equal(isRedNoContact("Red", true), true);
  assert.equal(isRedNoContact("Amber", true), false);
  assert.equal(isRedNoContact("Red", true, true), false);
  const y = participantAdvice({ systolic: 140, diastolic: 80, noContactRoute: true });
  assert.equal(y.pathway, "Standard");
  assert.deepEqual(y.paragraphs, BP_ADVICE_PARAGRAPHS.Yellow);
});

test("pregnancy takes precedence over no contact route", () => {
  assert.equal(participantAdvice({ systolic: 160, diastolic: 80, pregnant: true, noContactRoute: true }).pathway, "Maternity");
});

test("contact route required for amber/red unless pregnant", () => {
  assert.equal(needsContactRoute("Amber"), true);
  assert.equal(needsContactRoute("Red"), true);
  assert.equal(needsContactRoute("Yellow"), false);
  assert.equal(needsContactRoute("Red", true), false);
});

test("age calculation handles birthdays", () => {
  const on = new Date("2026-11-13T12:00:00Z");
  assert.equal(ageOn("2008-11-13", on), 18);
  assert.equal(ageOn("2008-11-14", on), 17);
  assert.ok(Number.isNaN(ageOn("not a date", on)));
});

test("unit conversions", () => {
  assert.equal(ftInToCm(5, 6), 167.6);
  assert.equal(stLbToKg(11, 0), 69.9);
});

test("amber with no direct contact routes via the GP when agreed", () => {
  const r = participantAdvice({ systolic: 160, diastolic: 80, contactViaGp: true });
  assert.equal(r.pathway, "GpContact");
  assert.deepEqual(r.paragraphs, GP_CONTACT_ADVICE);
  // GP route never applies to red
  assert.equal(participantAdvice({ systolic: 185, diastolic: 80, contactViaGp: true }).pathway, "Standard");
});

test("amber with no contact and no GP is told how to register", () => {
  const r = participantAdvice({ systolic: 160, diastolic: 80, noContactRoute: true, registeredWithGp: false });
  assert.equal(r.paragraphs.at(-1), NOT_REGISTERED_ADVICE);
});

test("amber and red without contact details are both flagged", () => {
  assert.equal(isNoContactFlag("Amber", true), true);
  assert.equal(isNoContactFlag("Red", true), true);
  assert.equal(isNoContactFlag("Yellow", true), false);
  assert.equal(isNoContactFlag("Amber", false), false);
  assert.equal(isNoContactFlag("Amber", true, true), false);
});
