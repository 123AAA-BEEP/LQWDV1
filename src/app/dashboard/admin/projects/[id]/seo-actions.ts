"use server";

import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import {
  generateSeoFields,
  maybeGenerateSeoOnPublish,
  type SeoFieldsValue,
} from "@/lib/seo";

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

/**
 * Backfills the four page sections (and any empty SEO fields) for published
 * projects that are missing them. Capped at 8 per run — re-run until `remaining`
 * is 0. Never overwrites existing copy. Admin-only; runs where ANTHROPIC_API_KEY
 * is set (i.e. on Vercel).
 */
export async function backfillSections(): Promise<
  { processed: number; remaining: number } | { error: string }
> {
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

  const { data: rows } = await supabase
    .from("public_projects_view")
    .select("project_id")
    .or(
      "section_intro.is.null,section_amenities.is.null,section_getting_around.is.null,section_developer.is.null",
    )
    .limit(500);
  const ids = (rows ?? [])
    .map((r) => (r as { project_id: string | null }).project_id)
    .filter((x): x is string => Boolean(x));

  let processed = 0;
  for (const id of ids.slice(0, 8)) {
    if (await maybeGenerateSeoOnPublish(id)) processed++;
  }
  return { processed, remaining: Math.max(0, ids.length - processed) };
}
