import { pgTable, text, integer, real, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  heightCm: real("height_cm").notNull(),
  weightKg: real("weight_kg").notNull(),
  waistCm: real("waist_cm"),
  bmi: real("bmi").notNull(),

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
  createdAt: true,
  volunteerName: true,
}).extend({
  volunteerCode: z.string().min(1),
});

export type InsertScreening = z.infer<typeof insertScreeningSchema>;
export type Screening = typeof screenings.$inferSelect;

export const updateOutcomeSchema = z.object({
  outcome: z.string(),
  outcomeNotes: z.string().optional(),
});
