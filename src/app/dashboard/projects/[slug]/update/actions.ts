"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUpdateField, type ProposedChange } from "@/lib/update-fields";

/** Best-effort category for the admin queue label, derived from the changes. */
function deriveType(changes: ProposedChange[], hasImages: boolean): string {
  const keys = new Set(changes.map((c) => c.key));
  if (keys.has("sales_status")) return "availability";
  if (keys.has("price_from_public") || keys.has("price_to_public"))
    return "pricing";
  if (changes.some((c) => c.source === "commercials")) return "commission";
  if (keys.has("broker_portal_url")) return "broker_portal";
  if (changes.length > 0) return "general";
  return hasImages ? "media" : "general";
}

/**
 * Submits a structured property update request. Approved realtors (and admins)
 * only. The payload is a list of field diffs (current → proposed) plus optional
 * images and a note; an admin reviews and applies it.
 */
export async function submitUpdateRequest(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const imageKind = String(formData.get("image_kind") ?? "").trim();
  const attachments = formData
    .getAll("attachment_paths")
    .map((p) => String(p).trim())
    .filter(Boolean);

  // Parse + sanitise the proposed changes against the known field registry.
  let changes: ProposedChange[] = [];
  try {
    const raw = JSON.parse(String(formData.get("changes") ?? "[]"));
    if (Array.isArray(raw)) {
      changes = raw
        .filter((c) => c && getUpdateField(c.key))
        .map((c) => {
          const f = getUpdateField(c.key)!;
          return {
            key: f.key,
            label: f.label,
            group: f.group,
            source: f.source,
            column: f.column,
            type: f.type,
            from: String(c.from ?? ""),
            to: String(c.to ?? ""),
          };
        });
    }
  } catch {
    changes = [];
  }

  const back = `/dashboard/projects/${slug}/update`;

  if (!projectId) {
    redirect(`${back}?error=${encodeURIComponent("Missing project.")}`);
  }
  if (changes.length === 0 && attachments.length === 0 && !note) {
    redirect(
      `${back}?error=${encodeURIComponent("Change at least one field, attach an image, or add a note.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Approved-only (defense in depth alongside the page gate).
  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.verification_status !== "approved") {
    redirect(
      `${back}?error=${encodeURIComponent("Verification is required to suggest updates.")}`,
    );
  }

  const { error } = await supabase.from("property_update_requests").insert({
    project_id: projectId,
    submitted_by_user_id: user.id,
    update_type: deriveType(changes, attachments.length > 0),
    update_payload: {
      changes,
      attachments,
      image_kind: imageKind || null,
      note: note || null,
    },
    status: "pending_review",
  });

  if (error) {
    redirect(`${back}?error=${encodeURIComponent("Could not submit. Please try again.")}`);
  }

  redirect("/dashboard/updates?message=submitted");
}
