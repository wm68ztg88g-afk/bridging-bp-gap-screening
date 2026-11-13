// Follow-up tracking for the admin view.
// Amber and red records are contacted by the SGH project team; yellow and
// green are self-directed, so only amber and red can become overdue.

import type { BpBand } from "./bp-protocol";

export const FOLLOW_UP_STATUSES = [
  "Not yet reviewed",
  "Unable to contact",
  "Contacted — advice given",
  "Referred to GP",
  "Referred to Acute Hypertension Clinic",
  "Appointment booked",
  "Attended",
  "Did not attend",
  "No contact route — self-referral advised",
  "No action needed",
] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const RESULT_OPTIONS = [
  "Not yet known",
  "New hypertension confirmed",
  "Hypertension not confirmed",
  "Already known hypertension",
] as const;
export type ResultOption = (typeof RESULT_OPTIONS)[number];

export const NOT_REVIEWED: FollowUpStatus = "Not yet reviewed";

/** Hours allowed before an un-reviewed record is overdue. */
export const FOLLOW_UP_DEADLINE_HOURS: Partial<Record<BpBand, number>> = {
  Red: 48,
  Amber: 28 * 24,
};

/** "No action needed" on an amber or red record must carry a reason. */
export function needsReason(band: BpBand, status: string): boolean {
  return status === "No action needed" && (band === "Red" || band === "Amber");
}

export function followUpDeadline(band: BpBand, createdAtIso: string): Date | null {
  const hours = FOLLOW_UP_DEADLINE_HOURS[band];
  if (hours === undefined) return null;
  const start = new Date(createdAtIso).getTime();
  if (!Number.isFinite(start)) return null;
  return new Date(start + hours * 3600 * 1000);
}

/** Overdue = amber/red, still not reviewed, and past its deadline. */
export function isOverdue(band: BpBand, status: string, createdAtIso: string, now: Date = new Date()): boolean {
  if (status !== NOT_REVIEWED) return false;
  const deadline = followUpDeadline(band, createdAtIso);
  return deadline !== null && now.getTime() > deadline.getTime();
}

/** Amber/red that still needs the project team to act. */
export function needsAction(band: BpBand, status: string): boolean {
  return (band === "Red" || band === "Amber") && (status === NOT_REVIEWED || status === "Unable to contact");
}

const BAND_RANK: Record<BpBand, number> = { Red: 0, Amber: 1, Yellow: 2, Green: 3 };

/** Sort key: overdue first, then items needing action, then band severity, then newest. */
export function compareForAdmin(
  a: { band: BpBand; status: string; createdAt: string },
  b: { band: BpBand; status: string; createdAt: string },
  now: Date = new Date(),
): number {
  const rank = (r: typeof a) =>
    isOverdue(r.band, r.status, r.createdAt, now) ? 0 : needsAction(r.band, r.status) ? 1 : 2;
  return (
    rank(a) - rank(b) ||
    BAND_RANK[a.band] - BAND_RANK[b.band] ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Unique people approximated by name + date of birth (case/space-insensitive). */
export function countUniquePeople(rows: { patientName: string; dob: string }[]): number {
  return new Set(rows.map((r) => `${r.patientName.trim().toLowerCase().replace(/\s+/g, " ")}|${r.dob}`)).size;
}
