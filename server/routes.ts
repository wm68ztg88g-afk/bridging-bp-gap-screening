import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage } from "./storage";
import { insertScreeningSchema, insertVolunteerSchema, updateOutcomeSchema } from "@shared/schema";

// Never ship a fallback admin credential. Configure this in the server runtime
// environment before publishing.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ message: "Admin access is not configured." });
  }
  // The CSV export link is a plain browser navigation (so the backend's
  // Content-Disposition header can trigger a native download inside the
  // preview iframe), which can't carry a custom header — accept the password
  // as a query param for that one case, falling back to the header otherwise.
  const password = (req.header("x-admin-password") || String(req.query.password || "") || "").trim();
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Incorrect admin password." });
  }
  next();
}

async function requireVolunteer(req: Request, res: Response, next: NextFunction) {
  const code = (req.header("x-volunteer-code") || "").trim();
  const volunteer = code ? await storage.getVolunteerByCode(code) : undefined;
  if (!volunteer || !volunteer.active) {
    return res.status(401).json({ message: "A valid volunteer access code is required." });
  }
  next();
}

function computeBmi(heightCm: number, weightKg: number) {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

function classifyBp(sys: number, dia: number) {
  if (sys >= 180 || dia >= 120) return { category: "Severe / possible crisis", urgent: true };
  if (sys >= 160 || dia >= 100) return { category: "Stage 2 hypertension", urgent: false };
  if (sys >= 140 || dia >= 90) return { category: "Stage 1 hypertension", urgent: false };
  if (sys >= 120 || dia >= 80) return { category: "High-normal", urgent: false };
  return { category: "Normal", urgent: false };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // -------------------------------------------------------------------
  // Volunteer login — validates a personal access code
  // -------------------------------------------------------------------
  app.post("/api/volunteer/login", async (req, res) => {
    const code = (req.body?.code || "").toString().trim();
    if (!code) return res.status(400).json({ message: "Enter your access code." });
    const volunteer = await storage.getVolunteerByCode(code);
    if (!volunteer || !volunteer.active) {
      return res.status(401).json({ message: "Access code not recognised. Please check with your coordinator." });
    }
    res.json({ id: volunteer.id, name: volunteer.name, code: volunteer.code });
  });

  // -------------------------------------------------------------------
  // Duplicate check (soft warning, not a hard block)
  // -------------------------------------------------------------------
  app.get("/api/screenings/check-duplicate", requireVolunteer, async (req, res) => {
    const name = (req.query.name || "").toString();
    const dob = (req.query.dob || "").toString();
    if (!name || !dob) return res.json({ duplicate: false });
    const existing = await storage.findPossibleDuplicate(name, dob);
    res.json({ duplicate: !!existing, existingDate: existing?.screeningDate });
  });

  // -------------------------------------------------------------------
  // Create screening record
  // -------------------------------------------------------------------
  app.post("/api/screenings", async (req, res) => {
    const parsed = insertScreeningSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: "Please check the form for missing or invalid fields.", issues: parsed.error.issues });
    }
    const data = parsed.data;

    const volunteer = await storage.getVolunteerByCode(data.volunteerCode);
    if (!volunteer || !volunteer.active) {
      return res.status(401).json({ message: "Your access code is no longer valid. Please log in again." });
    }

    const avgSystolic = Math.round((data.bp2Systolic + data.bp3Systolic) / 2);
    const avgDiastolic = Math.round((data.bp2Diastolic + data.bp3Diastolic) / 2);
    const bmi = computeBmi(data.heightCm, data.weightKg);
    const { category, urgent } = classifyBp(avgSystolic, avgDiastolic);

    const { volunteerCode, ...rest } = data;

    const record = await storage.createScreening({
      ...rest,
      volunteerId: volunteer.id,
      volunteerName: volunteer.name,
      avgSystolic,
      avgDiastolic,
      bmi,
      bpCategory: category,
      urgentFlag: urgent,
      outcome: "Not yet reviewed",
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(record);
  });

  // -------------------------------------------------------------------
  // Admin: list / export / outcome update — all require the admin password
  // -------------------------------------------------------------------
  app.post("/api/admin/login", (req, res) => {
    if (!ADMIN_PASSWORD) {
      return res.status(503).json({ message: "Admin access is not configured." });
    }
    const password = (req.body?.password || "").toString();
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Incorrect password." });
    }
    res.json({ ok: true });
  });

  app.get("/api/admin/screenings", requireAdmin, async (_req, res) => {
    const rows = await storage.listScreenings();
    res.json(rows);
  });

  app.get("/api/admin/screenings/export.csv", requireAdmin, async (_req, res) => {
    const rows = await storage.listScreenings();
    const headers = [
      "id", "screeningDate", "volunteerName", "hubLocation",
      "patientName", "dob", "sex", "ethnicity", "postcode", "phone",
      "preferredLanguage", "interpreterNeeded", "registeredWithGp", "gpPractice",
      "bp1Systolic", "bp1Diastolic", "bp2Systolic", "bp2Diastolic", "bp3Systolic", "bp3Diastolic",
      "avgSystolic", "avgDiastolic", "heartRate", "heightCm", "weightKg", "waistCm", "bmi",
      "knownHypertension", "currentMedications", "otherConditions", "smokingStatus", "familyHistoryHtn",
      "consentToContact", "consentGpContact", "bpCategory", "urgentFlag", "outcome", "outcomeNotes", "notes",
    ];
    const escape = (v: unknown) => {
      let s = v === null || v === undefined ? "" : String(v);
      // Prevent spreadsheet formula injection when an untrusted field is
      // opened in Excel/Sheets after export.
      if (/^[=+\-@]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(headers.map((h) => escape((r as any)[h])).join(","));
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="bp-gap-screenings-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(lines.join("\n"));
  });

  app.patch("/api/admin/screenings/:id/outcome", requireAdmin, async (req, res) => {
    const parsed = updateOutcomeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ message: "Invalid outcome." });
    const updated = await storage.updateOutcome(Number(req.params.id), parsed.data.outcome, parsed.data.outcomeNotes);
    res.json(updated);
  });

  app.get("/api/admin/volunteers", requireAdmin, async (_req, res) => {
    res.json(await storage.listVolunteers());
  });

  app.post("/api/admin/volunteers", requireAdmin, async (req, res) => {
    const parsed = insertVolunteerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ message: "Please provide a name and access code." });
    try {
      const created = await storage.createVolunteer(parsed.data);
      res.status(201).json(created);
    } catch (e) {
      res.status(400).json({ message: "That access code is already in use." });
    }
  });

  app.patch("/api/admin/volunteers/:id", requireAdmin, async (req, res) => {
    await storage.setVolunteerActive(Number(req.params.id), !!req.body?.active);
    res.json({ ok: true });
  });

  return httpServer;
}
