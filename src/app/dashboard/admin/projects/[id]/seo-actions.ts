"use server";

import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { generateSeoFields, type SeoFieldsValue } from "@/lib/seo";

export type SeoResult = SeoFieldsValue | { error: string };

/**
 * Manual "Generate with AI" action for the public-page editor (admin-only).
 * Publishing auto-generates missing SEO; this lets an admin generate/preview
 * before publishing or regenerate on demand.
 */
export async function generateSeo(projectId: string): Promise<SeoResult> {
  if (!projectId) return { error: "Missing project." };
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error:
        "AI isn’t configured yet — add ANTHROPIC_API_KEY in Vercel and redeploy.",
    };
  }

  const supabase = await createClient();
  try {
    await assertAdmin(supabase);
  } catch {
    return { error: "Admin access required." };
  }

  const gen = await generateSeoFields(projectId);
  if (!gen) {
    return { error: "Couldn’t generate SEO content. Please try again." };
  }
  return gen;
}
