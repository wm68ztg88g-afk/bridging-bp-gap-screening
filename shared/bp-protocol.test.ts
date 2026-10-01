import assert from "node:assert/strict";
import { test } from "node:test";
import { BP_ADVICE, EMERGENCY_ADVICE, classifyBp, type BpBand } from "./bp-protocol";
import { insertScreeningSchema } from "./schema";

const boundaries: [number, number, BpBand][] = [
  [135,85,"Green"],[136,85,"Yellow"],[135,86,"Yellow"],[149,89,"Yellow"],
  [150,89,"Amber"],[149,90,"Amber"],[179,119,"Amber"],
  [180,119,"Red"],[179,120,"Red"],[135,120,"Red"],[180,70,"Red"],
  [120,90,"Amber"],[150,70,"Amber"],[110,89,"Yellow"],[149,70,"Yellow"],
];
for (const [sys,dia,expected] of boundaries) {
  test(`${sys}/${dia} → ${expected}`, () => {
    const result=classifyBp(sys,dia);
    assert.equal(result.category,expected);
    assert.equal(result.urgent,expected==="Red");
    assert.equal(result.advice,BP_ADVICE[expected]);
  });
}
test("higher band wins across all integer readings in the tested range",()=>{
  for(let s=70;s<=250;s++)for(let d=40;d<=150;d++){
    const sb=s<=135?0:s<=149?1:s<=179?2:3;
    const db=d<=85?0:d<=89?1:d<=119?2:3;
    assert.equal(classifyBp(s,d).category,["Green","Yellow","Amber","Red"][Math.max(sb,db)]);
  }
});
test("reject invalid readings",()=>{
  for(const n of [0,-1,NaN,Infinity])assert.throws(()=>classifyBp(n,85));
});
test("approved timing and emergency wording only",()=>{
  assert.equal(BP_ADVICE.Green,"Good news! Your blood pressure is in the green range today. Keep up a healthy lifestyle to help it stay that way, and monitor your blood pressure regularly. If you take blood pressure medication, continue it as prescribed.");
  assert.equal(BP_ADVICE.Amber,"The SGH project team will contact you within 4 weeks of screening to arrange an appointment at St George’s Hospital. Also make an appointment to see your GP within 4 weeks.");
  assert.equal(BP_ADVICE.Yellow,"Make an appointment with your GP within 1 month.");
  assert.equal(BP_ADVICE.Red,"The SGH project team will contact you to arrange an urgent appointment in the next 24–48 hours at St George’s Hospital.");
  assert.doesNotMatch(EMERGENCY_ADVICE,/headache/i);
});
test("API schema requires consent and positive whole-number BP",()=>{
  assert.equal(insertScreeningSchema.shape.consentToContact.safeParse(false).success,false);
  assert.equal(insertScreeningSchema.shape.consentToContact.safeParse(true).success,true);
  for(const n of [0,-1,135.5]){
    assert.equal(insertScreeningSchema.shape.bp2Systolic.safeParse(n).success,false);
  }
});
