// What the participant is told, given their BP band and circumstances.
// Pregnancy and "no contact route" override the standard band advice.
//
// Clinical lead decisions, 13 November 2026:
// - Pregnant and BP above 135/85 (either reading): redirect to maternity services.
// - Amber with no phone/email: SGH team contacts the GP practice (if registered
//   and agreed); otherwise they are told to book their GP themselves.
// - Red with no contact details: told to go straight to SGH A&E; flagged in admin.
// Wording marked PENDING CONFIRMATION awaits clinical-lead sign-off.

import { classifyBp, BP_ADVICE_PARAGRAPHS, type BpBand } from "./bp-protocol";

export type AdvicePathway = "Standard" | "Maternity" | "PregnantInRange" | "GpContact" | "NoContactRoute";

export const PREGNANCY_THRESHOLD = { systolic: 135, diastolic: 85 } as const;

// PENDING CONFIRMATION ("today").
export const MATERNITY_ADVICE = [
  "Because you are pregnant, your blood pressure needs checking by your maternity team.",
  "Please contact your midwife or maternity assessment unit today.",
];
export const PREGNANT_IN_RANGE_ADVICE = [
  "Your blood pressure is in range today.",
  "Tell your midwife about this reading at your next appointment.",
];
export const NO_CONTACT_ADVICE: Partial<Record<BpBand, string[]>> = {
  Amber: ["We won’t be able to contact you, so please book a GP appointment within 4 weeks."],
  // Clinical lead, 13 Nov 2026: red with no contact details goes straight to SGH A&E,
  // and the record is flagged to the clinical lead.
  Red: ["We won’t be able to contact you, so please go straight to A&E at St George’s Hospital (Blackshaw Road, Tooting)."],
};
export const NOT_REGISTERED_ADVICE = "If you are not registered with a GP, you can register with any GP practice near you.";

// Amber with no phone/email: the clinical lead's default is to contact the GP
// practice instead (needs GP registration and the participant's agreement).
export const GP_CONTACT_ADVICE = [
  "The SGH project team will contact your GP practice about this reading within 4 weeks.",
  "Also make an appointment to see your GP within 4 weeks.",
];

/** Amber or red with no contact details: flagged to the clinical lead on the admin list. */
export function isNoContactFlag(band: BpBand, noContactRoute?: boolean | null, pregnant?: boolean | null): boolean {
  return (band === "Red" || band === "Amber") && !!noContactRoute && !pregnant;
}

/** Red with no contact details: told to attend SGH A&E and flagged to the clinical lead. */
export function isRedNoContact(band: BpBand, noContactRoute?: boolean | null, pregnant?: boolean | null): boolean {
  return band === "Red" && !!noContactRoute && !pregnant;
}

export function isAbovePregnancyThreshold(sys: number, dia: number): boolean {
  return sys > PREGNANCY_THRESHOLD.systolic || dia > PREGNANCY_THRESHOLD.diastolic;
}

export function participantAdvice(opts: {
  systolic: number;
  diastolic: number;
  pregnant?: boolean | null;
  noContactRoute?: boolean | null;
  contactViaGp?: boolean | null;
  registeredWithGp?: boolean | null;
}): { band: BpBand; pathway: AdvicePathway; paragraphs: string[]; advice: string } {
  const { category: band } = classifyBp(opts.systolic, opts.diastolic);
  let pathway: AdvicePathway = "Standard";
  let paragraphs = BP_ADVICE_PARAGRAPHS[band];

  if (opts.pregnant) {
    if (isAbovePregnancyThreshold(opts.systolic, opts.diastolic)) {
      pathway = "Maternity";
      paragraphs = MATERNITY_ADVICE;
    } else {
      pathway = "PregnantInRange";
      paragraphs = PREGNANT_IN_RANGE_ADVICE;
    }
  } else if (opts.contactViaGp && band === "Amber") {
    pathway = "GpContact";
    paragraphs = GP_CONTACT_ADVICE;
  } else if (opts.noContactRoute && NO_CONTACT_ADVICE[band]) {
    pathway = "NoContactRoute";
    paragraphs = opts.registeredWithGp === false
      ? [...NO_CONTACT_ADVICE[band]!, NOT_REGISTERED_ADVICE]
      : NO_CONTACT_ADVICE[band]!;
  }
  return { band, pathway, paragraphs, advice: paragraphs.join(" ") };
}

/** Amber/red (outside pregnancy) need a way for the SGH team to reach the participant. */
export function needsContactRoute(band: BpBand, pregnant?: boolean | null): boolean {
  return !pregnant && (band === "Amber" || band === "Red");
}

/** Whole years between date of birth and a reference date (YYYY-MM-DD strings or Dates). */
export function ageOn(dob: string, on: Date = new Date()): number {
  const d = new Date(`${dob.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return NaN;
  let age = on.getUTCFullYear() - d.getUTCFullYear();
  const m = on.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export const MIN_AGE = 18;

// Unit conversions (stored in cm / kg, one decimal place).
export const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * 2.54 * 10) / 10;
export const stLbToKg = (st: number, lb: number) => Math.round((st * 14 + lb) * 0.45359237 * 10) / 10;

export const HEIGHT_RANGE_CM = { min: 100, max: 230 } as const;
export const WEIGHT_RANGE_KG = { min: 25, max: 300 } as const;

export const MEASURE_METHODS = ["Measured", "Stated by participant", "Declined"] as const;
export const WEIGHT_METHODS = ["Measured", "Estimated by participant", "Declined"] as const;

export const LAST_BP_CHECK_OPTIONS = [
  "Never",
  "More than 5 years ago",
  "1 to 5 years ago",
  "Within the last year",
  "Don't know",
] as const;

export const CHECKED_BEFORE_OPTIONS = ["Yes", "No", "Not sure"] as const;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SITE_OPTIONS = ["EMHIP hub"] as const;
export const EMHIP_SITE = "EMHIP hub";
