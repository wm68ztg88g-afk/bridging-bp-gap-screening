import { test } from "node:test";
import assert from "node:assert/strict";
import {
  participantAdvice, needsContactRoute, ageOn, ftInToCm, stLbToKg, isAbovePregnancyThreshold,
  MATERNITY_ADVICE, PREGNANT_IN_RANGE_ADVICE,
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

test("no contact route changes amber/red advice only", () => {
  assert.equal(participantAdvice({ systolic: 160, diastolic: 80, noContactRoute: true }).pathway, "NoContactRoute");
  assert.equal(participantAdvice({ systolic: 185, diastolic: 80, noContactRoute: true }).pathway, "NoContactRoute");
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
