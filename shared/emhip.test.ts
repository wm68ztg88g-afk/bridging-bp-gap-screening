import assert from "node:assert/strict";
import { test } from "node:test";
import { insertScreeningSchema } from "./schema";
import { countEmhip, emhipLabel } from "./emhip";

test("EMHIP requires an explicit boolean on every new submission", () => {
  const field = insertScreeningSchema.shape.enrolledWithEmhip;
  for (const value of [true, false]) assert.equal(field.safeParse(value).success, true);
  for (const value of [undefined, null, "", "yes", "false", 0, 1])
    assert.equal(field.safeParse(value).success, false);
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
