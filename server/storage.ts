import { volunteers, screenings } from "@shared/schema";
import type { Volunteer, InsertVolunteer, Screening } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. This app requires a Postgres connection string " +
      "(e.g. from a Render Postgres database) to start."
  );
}

const pool = new Pool({
  connectionString,
  // Most managed Postgres providers (Render, Neon, Supabase) require TLS
  // but use certs that Node's default trust store won't validate.
  ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool);

// Ensure tables exist even if drizzle-kit push hasn't been run in this environment.
async function ensureSchema() {
  await pool.query(`
CREATE TABLE IF NOT EXISTS volunteers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS screenings (
  id SERIAL PRIMARY KEY,
  volunteer_id INTEGER NOT NULL,
  volunteer_name TEXT NOT NULL,
  hub_location TEXT,
  screening_date TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  sex TEXT NOT NULL,
  ethnicity TEXT NOT NULL,
  postcode TEXT NOT NULL,
  phone TEXT,
  preferred_language TEXT,
  interpreter_needed BOOLEAN NOT NULL DEFAULT false,
  registered_with_gp BOOLEAN NOT NULL,
  gp_practice TEXT,
  enrolled_with_emhip BOOLEAN,
  bp1_systolic INTEGER NOT NULL,
  bp1_diastolic INTEGER NOT NULL,
  bp2_systolic INTEGER NOT NULL,
  bp2_diastolic INTEGER NOT NULL,
  bp3_systolic INTEGER NOT NULL,
  bp3_diastolic INTEGER NOT NULL,
  avg_systolic INTEGER NOT NULL,
  avg_diastolic INTEGER NOT NULL,
  heart_rate INTEGER,
  height_cm REAL NOT NULL,
  weight_kg REAL NOT NULL,
  waist_cm REAL,
  bmi REAL NOT NULL,
  known_hypertension BOOLEAN NOT NULL,
  current_medications TEXT,
  other_conditions TEXT,
  smoking_status TEXT NOT NULL,
  family_history_htn BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  consent_to_contact BOOLEAN NOT NULL,
  consent_gp_contact BOOLEAN,
  bp_category TEXT NOT NULL,
  urgent_flag BOOLEAN NOT NULL DEFAULT false,
  outcome TEXT NOT NULL DEFAULT 'Not yet reviewed',
  outcome_notes TEXT,
  created_at TEXT NOT NULL
);
`);

  // Safe migration for databases created before this column existed —
  // CREATE TABLE IF NOT EXISTS above won't add columns to an existing table.
  await pool.query(`
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS consent_gp_contact BOOLEAN;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS enrolled_with_emhip BOOLEAN;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS result_outcome TEXT NOT NULL DEFAULT 'Not yet known';
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS contact_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS outcome_updated_at TEXT;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS first_action_at TEXT;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE screenings ALTER COLUMN height_cm DROP NOT NULL;
ALTER TABLE screenings ALTER COLUMN weight_kg DROP NOT NULL;
ALTER TABLE screenings ALTER COLUMN bmi DROP NOT NULL;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS height_method TEXT;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS weight_method TEXT;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS waist_declined BOOLEAN;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS bmi_estimated BOOLEAN;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS symptoms_reported BOOLEAN;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS pregnant BOOLEAN;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS advice_pathway TEXT;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS alt_contact TEXT;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS contact_via_gp BOOLEAN;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS no_contact_route BOOLEAN;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS last_bp_check TEXT;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS checked_before TEXT;
`);
}

// Fire immediately; every query below awaits the pool anyway so a slow first
// connection just delays the first request rather than crashing startup.
const schemaReady = ensureSchema();

export interface IStorage {
  getVolunteerByCode(code: string): Promise<Volunteer | undefined>;
  listVolunteers(): Promise<Volunteer[]>;
  createVolunteer(v: InsertVolunteer): Promise<Volunteer>;
  setVolunteerActive(id: number, active: boolean): Promise<void>;

  createScreening(s: typeof screenings.$inferInsert): Promise<Screening>;
  listScreenings(): Promise<Screening[]>;
  findPossibleDuplicate(patientName: string, dob: string): Promise<Screening | undefined>;
  getScreening(id: number): Promise<Screening | undefined>;
  updateFollowUp(id: number, patch: Partial<Screening>): Promise<Screening | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getVolunteerByCode(code: string) {
    await schemaReady;
    const rows = await db.select().from(volunteers).where(eq(volunteers.code, code));
    return rows[0];
  }

  async listVolunteers() {
    await schemaReady;
    return db.select().from(volunteers).orderBy(desc(volunteers.createdAt));
  }

  async createVolunteer(v: InsertVolunteer) {
    await schemaReady;
    const rows = await db
      .insert(volunteers)
      .values({ ...v, createdAt: new Date().toISOString() })
      .returning();
    return rows[0];
  }

  async setVolunteerActive(id: number, active: boolean) {
    await schemaReady;
    await db.update(volunteers).set({ active }).where(eq(volunteers.id, id));
  }

  async createScreening(s: typeof screenings.$inferInsert) {
    await schemaReady;
    const rows = await db.insert(screenings).values(s).returning();
    return rows[0];
  }

  async listScreenings() {
    await schemaReady;
    return db.select().from(screenings).orderBy(desc(screenings.createdAt));
  }

  async findPossibleDuplicate(patientName: string, dob: string) {
    await schemaReady;
    const all = await db.select().from(screenings);
    return all.find(
      (r) => r.patientName.trim().toLowerCase() === patientName.trim().toLowerCase() && r.dob === dob
    );
  }

  async getScreening(id: number) {
    await schemaReady;
    const rows = await db.select().from(screenings).where(eq(screenings.id, id));
    return rows[0];
  }

  async updateFollowUp(id: number, patch: Partial<Screening>) {
    await schemaReady;
    await db.update(screenings).set(patch).where(eq(screenings.id, id));
    return this.getScreening(id);
  }

}

export const storage = new DatabaseStorage();
