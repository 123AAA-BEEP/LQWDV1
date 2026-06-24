"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/** Saves the AI SEO prompt instructions (admin-only). Applies to all future generations. */
export async function saveSeoPromptSettings(formData: FormData) {
  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase.from("seo_prompt_settings").upsert(
    {
      id: 1,
      overall_instructions: str(formData.get("overall_instructions")),
      seo_title_instructions: str(formData.get("seo_title_instructions")),
      seo_meta_description_instructions: str(
        formData.get("seo_meta_description_instructions"),
      ),
      page_summary_instructions: str(formData.get("page_summary_instructions")),
      page_description_instructions: str(
        formData.get("page_description_instructions"),
      ),
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    },
    { onConflict: "id" },
  );

  revalidatePath("/dashboard/admin/settings");
  redirect("/dashboard/admin/settings?saved=1");
}
