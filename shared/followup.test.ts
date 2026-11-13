import { test } from "node:test";
import assert from "node:assert/strict";
import { isOverdue, needsAction, needsReason, compareForAdmin, countUniquePeople } from "./followup";

const t0 = "2026-11-01T09:00:00.000Z";
const hoursLater = (h: number) => new Date(new Date(t0).getTime() + h * 3600 * 1000);

test("red becomes overdue after 48 hours if not reviewed", () => {
  assert.equal(isOverdue("Red", "Not yet reviewed", t0, hoursLater(47)), false);
  assert.equal(isOverdue("Red", "Not yet reviewed", t0, hoursLater(49)), true);
});

test("amber becomes overdue after 4 weeks if not reviewed", () => {
  assert.equal(isOverdue("Amber", "Not yet reviewed", t0, hoursLater(27 * 24)), false);
  assert.equal(isOverdue("Amber", "Not yet reviewed", t0, hoursLater(29 * 24)), true);
});

test("reviewed records and yellow/green are never overdue", () => {
  assert.equal(isOverdue("Red", "Unable to contact", t0, hoursLater(100)), false);
  assert.equal(isOverdue("Yellow", "Not yet reviewed", t0, hoursLater(10000)), false);
  assert.equal(isOverdue("Green", "Not yet reviewed", t0, hoursLater(10000)), false);
});

test("needs action covers unreviewed and unable-to-contact amber/red only", () => {
  assert.equal(needsAction("Amber", "Not yet reviewed"), true);
  assert.equal(needsAction("Red", "Unable to contact"), true);
  assert.equal(needsAction("Red", "Appointment booked"), false);
  assert.equal(needsAction("Yellow", "Not yet reviewed"), false);
});

test("no action needed requires a reason only for amber/red", () => {
  assert.equal(needsReason("Red", "No action needed"), true);
  assert.equal(needsReason("Amber", "No action needed"), true);
  assert.equal(needsReason("Yellow", "No action needed"), false);
  assert.equal(needsReason("Red", "Referred to GP"), false);
});

test("admin sort puts overdue first, then needs-action, then band severity", () => {
  const now = hoursLater(60);
  const rows = [
    { id: "green", band: "Green" as const, status: "Not yet reviewed", createdAt: t0 },
    { id: "amberNew", band: "Amber" as const, status: "Not yet reviewed", createdAt: t0 },
    { id: "redOverdue", band: "Red" as const, status: "Not yet reviewed", createdAt: t0 },
    { id: "redDone", band: "Red" as const, status: "Attended", createdAt: t0 },
  ];
  const order = [...rows].sort((a, b) => compareForAdmin(a, b, now)).map((r) => r.id);
  assert.deepEqual(order, ["redOverdue", "amberNew", "redDone", "green"]);
});

test("unique people counts name + DOB once, ignoring case and spacing", () => {
  assert.equal(
    countUniquePeople([
      { patientName: "Jane Doe", dob: "1954-11-13" },
      { patientName: " jane  doe ", dob: "1954-11-13" },
      { patientName: "Jane Doe", dob: "1960-01-01" },
    ]),
    2,
  );
});
