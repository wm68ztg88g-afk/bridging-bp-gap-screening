// Programme screening action bands, not diagnostic stages.
// Source: participant flier and clinical-lead confirmation, 29 September 2026.
export const BP_PROTOCOL_VERSION = "2026-09-29";
export type BpBand = "Green" | "Yellow" | "Amber" | "Red";

export const BP_ADVICE: Record<BpBand, string> = {
  Green: "Continue blood pressure checks and treatment as advised.",
  Yellow: "See your GP within 1 month. Take your results card with you.",
  Amber: "The SGH project team will contact you within 4 weeks of screening to arrange an appointment. Also see your GP within 4 weeks.",
  Red: "The SGH project team will contact you to arrange an urgent appointment.",
};

export const BP_THRESHOLDS: Record<BpBand, string> = {
  Green: "Top ≤135 AND bottom ≤85",
  Yellow: "Top 136–149 OR bottom 86–89",
  Amber: "Top 150–179 OR bottom 90–119",
  Red: "Top ≥180 OR bottom ≥120",
};

export const EMERGENCY_ADVICE =
  "Call 999 now if you have chest pain, sudden weakness or numbness, blurred or lost vision, confusion or difficulty breathing. Do not wait for the project team to contact you.";

/** Classify the already-rounded average of readings 2 and 3. Higher band wins. */
export function classifyBp(sys: number, dia: number) {
  if (!Number.isFinite(sys) || !Number.isFinite(dia) || sys <= 0 || dia <= 0) {
    throw new Error("Positive finite blood pressure readings are required.");
  }
  const category: BpBand =
    sys >= 180 || dia >= 120 ? "Red" :
    sys >= 150 || dia >= 90 ? "Amber" :
    sys > 135 || dia > 85 ? "Yellow" : "Green";
  return { category, urgent: category === "Red", advice: BP_ADVICE[category] };
}
