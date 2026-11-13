import { pgTable, text, integer, real, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { FOLLOW_UP_STATUSES, RESULT_OPTIONS } from "./followup";
import {
  MEASURE_METHODS, WEIGHT_METHODS, LAST_BP_CHECK_OPTIONS, CHECKED_BEFORE_OPTIONS,
  HEIGHT_RANGE_CM, WEIGHT_RANGE_KG, MIN_AGE, ageOn, EMHIP_SITE,
} from "./participant-advice";

// ---------------------------------------------------------------------------
// Volunteers — trained & DBS-cleared community volunteers who collect data
// ---------------------------------------------------------------------------
export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // personal access code (given after DBS/training sign-off)
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const insertVolunteerSchema = createInsertSchema(volunteers).omit({
  id: true,
  createdAt: true,
});
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type Volunteer = typeof volunteers.$inferSelect;

// ---------------------------------------------------------------------------
// Screenings — one record per patient encounter
// ---------------------------------------------------------------------------
export const screenings = pgTable("screenings", {
  id: serial("id").primaryKey(),

  // Who collected it / where
  volunteerId: integer("volunteer_id").notNull(),
  volunteerName: text("volunteer_name").notNull(),
  hubLocation: text("hub_location"),
  screeningDate: text("screening_date").notNull(),

  // Patient details
  patientName: text("patient_name").notNull(),
  dob: text("dob").notNull(),
  sex: text("sex").notNull(),
  ethnicity: text("ethnicity").notNull(),
  postcode: text("postcode").notNull(),
  phone: text("phone"),
  preferredLanguage: text("preferred_language"),
  interpreterNeeded: boolean("interpreter_needed").notNull().default(false),

  registeredWithGp: boolean("registered_with_gp").notNull(),
  gpPractice: text("gp_practice"),
  // Nullable for records collected before this question was introduced.
  enrolledWithEmhip: boolean("enrolled_with_emhip"),

  // Blood pressure — 3 readings, avg of last two per protocol
  bp1Systolic: integer("bp1_systolic").notNull(),
  bp1Diastolic: integer("bp1_diastolic").notNull(),
  bp2Systolic: integer("bp2_systolic").notNull(),
  bp2Diastolic: integer("bp2_diastolic").notNull(),
  bp3Systolic: integer("bp3_systolic").notNull(),
  bp3Diastolic: integer("bp3_diastolic").notNull(),
  avgSystolic: integer("avg_systolic").notNull(),
  avgDiastolic: integer("avg_diastolic").notNull(),
  heartRate: integer("heart_rate"),

  // Anthropometrics
  // Nullable since 13 Nov 2026: height, weight and waist may be declined.
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  waistCm: real("waist_cm"),
  bmi: real("bmi"),
  heightMethod: text("height_method"),   // Measured | Stated by participant | Declined
  weightMethod: text("weight_method"),   // Measured | Estimated by participant | Declined
  waistDeclined: boolean("waist_declined"),
  bmiEstimated: boolean("bmi_estimated"),

  // Safety and reach (added 13 Nov 2026; null on earlier records)
  symptomsReported: boolean("symptoms_reported"),
  pregnant: boolean("pregnant"),
  advicePathway: text("advice_pathway"),
  altContact: text("alt_contact"),
  noContactRoute: boolean("no_contact_route"),
  lastBpCheck: text("last_bp_check"),
  checkedBefore: text("checked_before"),

  // Medical history
  knownHypertension: boolean("known_hypertension").notNull(),
  currentMedications: text("current_medications"),
  otherConditions: text("other_conditions"), // JSON string array
  smokingStatus: text("smoking_status").notNull(),
  familyHistoryHtn: boolean("family_history_htn").notNull().default(false),

  notes: text("notes"),
  consentToContact: boolean("consent_to_contact").notNull(),
  consentGpContact: boolean("consent_gp_contact"),

  // Computed / triage
  bpCategory: text("bp_category").notNull(),
  urgentFlag: boolean("urgent_flag").notNull().default(false),

  // Follow-up outcome (filled in later by the clinical lead, not the volunteer)
  outcome: text("outcome").notNull().default("Not yet reviewed"),
  outcomeNotes: text("outcome_notes"),
  resultOutcome: text("result_outcome").notNull().default("Not yet known"),
  contactAttempts: integer("contact_attempts").notNull().default(0),
  outcomeUpdatedAt: text("outcome_updated_at"),
  firstActionAt: text("first_action_at"),
  // Test entries are kept for audit but excluded from all counts and alerts.
  isTest: boolean("is_test").notNull().default(false),

  createdAt: text("created_at").notNull(),
});

export const insertScreeningSchema = createInsertSchema(screenings).omit({
  id: true,
  volunteerId: true,
  avgSystolic: true,
  avgDiastolic: true,
  bmi: true,
  bpCategory: true,
  urgentFlag: true,
  outcome: true,
  outcomeNotes: true,
  bmiEstimated: true,
  advicePathway: true,
  resultOutcome: true,
  contactAttempts: true,
  outcomeUpdatedAt: true,
  firstActionAt: true,
  isTest: true,
  createdAt: true,
  volunteerName: true,
}).extend({
  volunteerCode: z.string().min(1),
  bp1Systolic: z.number().int().positive(),
  bp1Diastolic: z.number().int().positive(),
  bp2Systolic: z.number().int().positive(),
  bp2Diastolic: z.number().int().positive(),
  bp3Systolic: z.number().int().positive(),
  bp3Diastolic: z.number().int().positive(),
  heightMethod: z.enum(MEASURE_METHODS),
  weightMethod: z.enum(WEIGHT_METHODS),
  heightCm: z.number().min(HEIGHT_RANGE_CM.min).max(HEIGHT_RANGE_CM.max).nullable(),
  weightKg: z.number().min(WEIGHT_RANGE_KG.min).max(WEIGHT_RANGE_KG.max).nullable(),
  waistCm: z.number().min(40).max(250).nullable(),
  waistDeclined: z.boolean(),
  consentToContact: z.literal(true),
  hubLocation: z.string().trim().min(1),
  // Only asked at the EMHIP hub; null elsewhere.
  enrolledWithEmhip: z.boolean().nullable(),
  symptomsReported: z.boolean(),
  pregnant: z.boolean(),
  lastBpCheck: z.enum(LAST_BP_CHECK_OPTIONS),
  checkedBefore: z.enum(CHECKED_BEFORE_OPTIONS),
  phone: z.string().trim().max(40).nullable(),
  altContact: z.string().trim().max(200).nullable(),
  noContactRoute: z.boolean(),
}).superRefine((d, ctx) => {
  if (d.registeredWithGp && !d.gpPractice?.trim()) {
    ctx.addIssue({ code: "custom", path: ["gpPractice"], message: "GP practice is required when registered." });
  }
  if (d.heightMethod === "Declined" ? d.heightCm !== null : d.heightCm === null) {
    ctx.addIssue({ code: "custom", path: ["heightCm"], message: "Height must match its method." });
  }
  if (d.weightMethod === "Declined" ? d.weightKg !== null : d.weightKg === null) {
    ctx.addIssue({ code: "custom", path: ["weightKg"], message: "Weight must match its method." });
  }
  if (d.waistDeclined && d.waistCm !== null) {
    ctx.addIssue({ code: "custom", path: ["waistCm"], message: "Waist declined but a value was given." });
  }
  if (d.hubLocation === EMHIP_SITE ? typeof d.enrolledWithEmhip !== "boolean" : d.enrolledWithEmhip !== null) {
    ctx.addIssue({ code: "custom", path: ["enrolledWithEmhip"], message: "EMHIP answer is required at the EMHIP hub only." });
  }
  const age = ageOn(d.dob);
  if (!(age >= MIN_AGE) || age > 120) {
    ctx.addIssue({ code: "custom", path: ["dob"], message: "Participants must be 18 or over." });
  }
});

export type InsertScreening = z.infer<typeof insertScreeningSchema>;
export type Screening = typeof screenings.$inferSelect;

export const updateOutcomeSchema = z.object({
  outcome: z.enum(FOLLOW_UP_STATUSES),
  resultOutcome: z.enum(RESULT_OPTIONS).optional(),
  contactAttempts: z.number().int().min(0).max(50).optional(),
  outcomeNotes: z.string().max(2000).optional(),
});
export type UpdateOutcome = z.infer<typeof updateOutcomeSchema>;

export const setTestSchema = z.object({ isTest: z.boolean() });
