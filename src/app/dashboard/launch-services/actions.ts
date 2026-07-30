"use server";

import { requireUserProfile } from "@/lib/auth";
import { sendEmail, brandedEmail } from "@/lib/email";
import { redirectWithFlash } from "@/lib/flash";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const FLAVOURS = ["essentials", "full-engine", "rescue"];
const STAGES = ["pre-launch", "launching-now", "selling-slow", "stalled"];

/**
 * Launch Services interest capture — the "kitty" signal collector. No
 * framework exists yet by design; every submission is a demand datapoint
 * (and a warm BD call) that tells us which flavour to standardize first.
 */
export async function registerLaunchInterest(formData: FormData) {
  const { profile } = await requireUserProfile();

  const project = String(formData.get("project") ?? "").trim().slice(0, 200);
  const city = String(formData.get("city") ?? "").trim().slice(0, 120);
  const units = String(formData.get("units") ?? "").trim().slice(0, 20);
  const rawFlavour = String(formData.get("flavour") ?? "");
  const flavour = FLAVOURS.includes(rawFlavour) ? rawFlavour : null;
  const rawStage = String(formData.get("stage") ?? "");
  const stage = STAGES.includes(rawStage) ? rawStage : null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000);

  if (!project) {
    redirectWithFlash(
      "/dashboard/launch-services",
      "Tell us which project needs the boost.",
      "error",
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const who =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email ||
    "A developer";
  const rows = [
    `<strong>Developer:</strong> ${esc(who)}${profile.email ? ` · ${esc(profile.email)}` : ""}`,
    `<strong>Project:</strong> ${esc(project)}${city ? ` (${esc(city)})` : ""}`,
    units ? `<strong>Units:</strong> ${esc(units)}` : null,
    stage ? `<strong>Stage:</strong> ${esc(stage)}` : null,
    flavour ? `<strong>Direction picked:</strong> ${esc(flavour)}` : null,
    notes ? `<strong>Notes:</strong> ${esc(notes)}` : null,
  ]
    .filter(Boolean)
    .join("<br>");

  void sendEmail({
    to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    replyTo: profile.email ?? undefined,
    subject: `Launch Services interest: ${project}${flavour ? ` (${flavour})` : ""}`,
    html: brandedEmail({
      heading: "A developer wants launch help",
      body:
        "Launch Services demand signal — this is a warm BD call and a vote " +
        `for which package to standardize first.<br><br>${rows}`,
      ctaUrl: `${base}/dashboard/admin`,
      ctaLabel: "Open the admin console",
    }),
  });

  redirectWithFlash(
    "/dashboard/launch-services",
    "Got it — our team will reach out within one business day to scope the launch.",
  );
}

/** PBR lead-partnership interest — same kitty, rental flavour. */
export async function registerRentalPartnerInterest(formData: FormData) {
  const { profile } = await requireUserProfile();

  const building = String(formData.get("building") ?? "").trim().slice(0, 200);
  const city = String(formData.get("city") ?? "").trim().slice(0, 120);
  const units = String(formData.get("units") ?? "").trim().slice(0, 20);
  const leaseup = String(formData.get("leaseup") ?? "").trim().slice(0, 120);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000);

  if (!building) {
    redirectWithFlash(
      "/dashboard/rental-partners",
      "Tell us which building you're leasing.",
      "error",
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const who =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email ||
    "A developer";
  const rows = [
    `<strong>Developer:</strong> ${esc(who)}${profile.email ? ` · ${esc(profile.email)}` : ""}`,
    `<strong>Building:</strong> ${esc(building)}${city ? ` (${esc(city)})` : ""}`,
    units ? `<strong>Units:</strong> ${esc(units)}` : null,
    leaseup ? `<strong>Lease-up window:</strong> ${esc(leaseup)}` : null,
    notes ? `<strong>Notes:</strong> ${esc(notes)}` : null,
  ]
    .filter(Boolean)
    .join("<br>");

  void sendEmail({
    to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    replyTo: profile.email ?? undefined,
    subject: `PBR lead partnership interest: ${building}${city ? ` (${city})` : ""}`,
    html: brandedEmail({
      heading: "A PBR developer wants qualified renter leads",
      body:
        "Rental lead-partnership demand signal — pilot pricing conversation. " +
        `<br><br>${rows}`,
      ctaUrl: `${base}/dashboard/admin`,
      ctaLabel: "Open the admin console",
    }),
  });

  redirectWithFlash(
    "/dashboard/rental-partners",
    "Got it — our team will reach out within one business day with pilot terms.",
  );
}
