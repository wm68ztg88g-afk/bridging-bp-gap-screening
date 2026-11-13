// Email alert to the clinical lead when an amber or red screening is saved.
//
// Deliberately contains NO patient-identifiable information: only the band,
// the site and the time, with a prompt to sign in to the admin page.
//
// Configure in the Render environment (all three are needed; if any is
// missing, alerts are silently skipped and screening still works):
//   RESEND_API_KEY   API key from resend.com
//   ALERT_EMAIL_TO   where alerts go (the clinical lead's address)
//   ALERT_EMAIL_FROM sender, e.g. "BP Gap alerts <onboarding@resend.dev>"
//   APP_URL          optional, link included in the email

import type { BpBand } from "@shared/bp-protocol";

export function alertsConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.ALERT_EMAIL_TO && process.env.ALERT_EMAIL_FROM);
}

export function buildAlert(band: BpBand, site: string | null | undefined, when: Date) {
  const place = site?.trim() ? site.trim() : "an unrecorded site";
  const time = when.toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });
  const deadline = band === "Red" ? "within 24–48 hours" : "within 4 weeks";
  const subject = `${band.toUpperCase()} BP screening recorded — action needed`;
  const appUrl = process.env.APP_URL?.trim();
  const text = [
    `A ${band.toLowerCase()} blood pressure screening was recorded at ${place} on ${time}.`,
    `The participant has been told the SGH project team will contact them ${deadline}.`,
    "",
    `Sign in to the admin page to see the record${appUrl ? `: ${appUrl}/#/admin` : "."}`,
    "",
    "No patient details are included in this email.",
  ].join("\n");
  return { subject, text };
}

export async function sendBandAlert(band: BpBand, site: string | null | undefined, when: Date): Promise<void> {
  if (band !== "Red" && band !== "Amber") return;
  if (!alertsConfigured()) return;
  const { subject, text } = buildAlert(band, site, when);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.ALERT_EMAIL_FROM,
        to: process.env.ALERT_EMAIL_TO!.split(",").map((s) => s.trim()).filter(Boolean),
        subject,
        text,
      }),
    });
    if (!res.ok) console.error(`Alert email failed: HTTP ${res.status}`);
  } catch (e) {
    // Never let an alert failure affect saving a screening.
    console.error("Alert email failed:", (e as Error).message);
  }
}
