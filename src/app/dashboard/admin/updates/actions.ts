"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { rewardUpdateApproved } from "@/lib/rewards";
import { applyUpdateChanges } from "@/lib/update-apply";
import type { ProposedChange } from "@/lib/update-fields";

/**
 * Decides a property update request. Approval applies the request's structured
 * field changes to the canonical tables (projects / commercials / portal),
 * marks it approved, and rewards the submitter. Admin-only.
 */
export async function decideUpdate(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const status = String(formData.get("status") ?? "");
  let notes = String(formData.get("admin_notes") ?? "").trim();

  if (!requestId) return;
  if (!["approved", "rejected", "needs_changes"].includes(status)) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  // Read the request first so we know who to reward, on which project, and what
  // structured changes to apply.
  const { data: request } = await supabase
    .from("property_update_requests")
    .select("id, submitted_by_user_id, project_id, update_payload")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return;

  // On approval, apply the structured field diff to the canonical tables.
  if (status === "approved") {
    const payload = (request.update_payload ?? {}) as Record<string, unknown>;
    const changes = Array.isArray(payload.changes)
      ? (payload.changes as ProposedChange[])
      : [];
    if (changes.length > 0) {
      const result = await applyUpdateChanges(
        request.project_id as string,
        changes,
      );
      const summary = [
        result.applied.length
          ? `Applied: ${result.applied.join(", ")}.`
          : null,
        result.skipped.length
          ? `Skipped: ${result.skipped
              .map((s) => `${s.label} (${s.reason})`)
              .join(", ")}.`
          : null,
      ]
        .filter(Boolean)
        .join(" ");
      notes = [notes, summary].filter(Boolean).join("\n");
    }
  }

  await supabase
    .from("property_update_requests")
    .update({
      status,
      admin_notes: notes || null,
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  // Reward an approved update: Pro days + lead stewardship that bumps any prior
  // steward on this project. Idempotent per request.
  if (status === "approved") {
    await rewardUpdateApproved(
      request.submitted_by_user_id as string,
      request.id as string,
      request.project_id as string,
    );
  }

  revalidatePath("/dashboard/admin/updates");
  revalidatePath("/dashboard/admin");
}
