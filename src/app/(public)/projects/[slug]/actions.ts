"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Public lead capture. RLS allows anon INSERT into project_leads.
 * No private data is touched here.
 */
export async function submitLead(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const project_id = String(formData.get("project_id") ?? "");
  const public_page_id = String(formData.get("public_page_id") ?? "");
  const lead_name = String(formData.get("lead_name") ?? "").trim();
  const lead_email = String(formData.get("lead_email") ?? "").trim();
  const lead_phone = String(formData.get("lead_phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!project_id || !lead_name || !lead_email) {
    return { error: "Please provide your name and email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("project_leads").insert({
    project_id,
    public_project_page_id: public_page_id || null,
    lead_name,
    lead_email,
    lead_phone: lead_phone || null,
    message: message || null,
    status: "new",
  });

  if (error) {
    return { error: "Something went wrong. Please try again." };
  }
}
