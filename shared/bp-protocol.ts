// Programme screening action bands, not diagnostic stages.
// Thresholds: participant flier, 29 September 2026.
// Advice: clinical-lead revisions, 1 October 2026 (including red 24–48 hours).
export const BP_PROTOCOL_VERSION = "2026-10-01-v2";
export type BpBand = "Green" | "Yellow" | "Amber" | "Red";

export const BP_ADVICE_PARAGRAPHS: Record<BpBand, string[]> = {
  Green: [
    "Good news! Your blood pressure is in the green range today.",
    "Keep up a healthy lifestyle to help it stay that way, and monitor your blood pressure regularly.",
    "If you take blood pressure medication, continue it as prescribed.",
  ],
  Yellow: ["Make an appointment with your GP within 1 month."],
  Amber: [
    "The SGH project team will contact you within 4 weeks of screening to arrange an appointment at St George’s Hospital.",
    "Also make an appointment to see your GP within 4 weeks.",
  ],
  Red: ["The SGH project team will contact you to arrange an urgent appointment in the next 24–48 hours at St George’s Hospital."],
};
export const BP_ADVICE = Object.fromEntries(
  Object.entries(BP_ADVICE_PARAGRAPHS).map(([band, paragraphs]) => [band, paragraphs.join(" ")])
) as Record<BpBand, string>;

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
