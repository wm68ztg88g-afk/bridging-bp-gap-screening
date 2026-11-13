// Text-message alert to the clinical lead when an amber or red screening is
// saved, sent through GOV.UK Notify (available to NHS organisations).
//
// Deliberately contains NO patient-identifiable information: only the band,
// the site and the time, with a prompt to sign in to the admin page.
//
// Configure in the Render environment (all three are needed; if any is
// missing, alerts are skipped and screening still works):
//   NOTIFY_API_KEY          API key from GOV.UK Notify
//   NOTIFY_SMS_TEMPLATE_ID  ID of a text template whose content is: ((message))
//   ALERT_PHONE             mobile number(s) to text, comma-separated

import { NotifyClient } from "notifications-node-client";
import type { BpBand } from "@shared/bp-protocol";

export function alertsConfigured(): boolean {
  return !!(process.env.NOTIFY_API_KEY && process.env.NOTIFY_SMS_TEMPLATE_ID && process.env.ALERT_PHONE);
}

/** Kept under 160 characters so each alert costs a single text. */
export function buildAlert(band: BpBand, site: string | null | undefined, when: Date): string {
  const place = site?.trim() ? site.trim().slice(0, 40) : "unrecorded site";
  const time = when.toLocaleString("en-GB", {
    timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const deadline = band === "Red" ? "24-48h" : "4 wks";
  return `BP Gap: ${band.toUpperCase()} screening at ${place}, ${time}. Follow up within ${deadline}. Sign in to admin to view. No patient details sent.`;
}

export async function sendBandAlert(band: BpBand, site: string | null | undefined, when: Date): Promise<void> {
  if (band !== "Red" && band !== "Amber") return;
  if (!alertsConfigured()) return;
  const client = new NotifyClient(process.env.NOTIFY_API_KEY!);
  const message = buildAlert(band, site, when);
  const numbers = process.env.ALERT_PHONE!.split(",").map((s) => s.trim()).filter(Boolean);
  for (const phone of numbers) {
    try {
      await client.sendSms(process.env.NOTIFY_SMS_TEMPLATE_ID!, phone, { personalisation: { message } });
    } catch (e: any) {
      // Never let an alert failure affect saving a screening; never log the number.
      console.error("Alert text failed:", e?.response?.status ?? e?.message ?? "unknown error");
    }
  }
}
