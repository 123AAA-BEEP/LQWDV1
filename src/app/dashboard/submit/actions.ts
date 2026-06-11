"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a new property submission for admin review. RLS allows insert where
 * submitted_by_user_id = auth.uid().
 */
export async function submitProperty(formData: FormData) {
  const project_name = String(formData.get("project_name") ?? "").trim();
  const builder_name = String(formData.get("builder_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address_text = String(formData.get("address_text") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();

  if (!project_name) {
    redirect("/dashboard/submit?error=" + encodeURIComponent("Project name is required."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("property_submissions").insert({
    submitted_by_user_id: user.id,
    project_name,
    builder_name: builder_name || null,
    city: city || null,
    address_text: address_text || null,
    submission_payload: details ? { details } : {},
    status: "pending_review",
  });

  if (error) {
    redirect("/dashboard/submit?error=" + encodeURIComponent("Could not submit. Please try again."));
  }
  redirect("/dashboard/submit?message=submitted");
}
