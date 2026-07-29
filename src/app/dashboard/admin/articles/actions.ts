"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { redirectWithFlash } from "@/lib/flash";
import {
  generateArticleDraft,
  ARTICLE_TYPES,
  type ArticleType,
} from "@/lib/articles";

const LIST_PATH = "/dashboard/admin/articles";
const TYPE_VALUES = ARTICLE_TYPES.map((t) => t.value);

/**
 * Drafts a new article with AI from the selected projects and drops the admin
 * into the editor. Generation is grounded in public_projects_view only (see
 * lib/articles) and the result lands as status='draft' — publishing is a
 * separate, deliberate step.
 */
export async function generateArticle(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const articleType = String(formData.get("article_type") ?? "");
  const projectIds = formData
    .getAll("project_id")
    .map((v) => String(v))
    .filter(Boolean);

  if (!TYPE_VALUES.includes(articleType as ArticleType)) {
    redirectWithFlash(LIST_PATH, "Pick an article type.", "error");
  }
  if (projectIds.length === 0) {
    redirectWithFlash(
      LIST_PATH,
      "Select at least one published project to ground the article in.",
      "error",
    );
  }

  const draft = await generateArticleDraft(
    articleType as ArticleType,
    projectIds,
  );
  if (!draft) {
    redirectWithFlash(
      LIST_PATH,
      "Generation didn't complete — check the selected projects are published and ANTHROPIC_API_KEY is set, then try again.",
      "error",
    );
  }

  // Slugs are unique; on a collision keep the content and de-dupe the slug.
  let insertError: string | null = null;
  let newId: string | null = null;
  for (const slug of [
    draft.slug,
    `${draft.slug}-${Date.now().toString(36).slice(-4)}`.slice(0, 120),
  ]) {
    const { data, error } = await supabase
      .from("articles")
      .insert({
        slug,
        status: "draft",
        article_type: articleType,
        title: draft.title,
        excerpt: draft.excerpt || null,
        body_md: draft.body_md,
        seo_title: draft.seo_title || null,
        seo_meta_description: draft.seo_meta_description || null,
        related_project_ids: draft.related_project_ids,
        generated_by_ai: true,
      })
      .select("id")
      .maybeSingle();
    if (!error && data) {
      newId = data.id as string;
      break;
    }
    insertError = error?.message ?? "insert failed";
    if (error?.code !== "23505") break; // only retry on unique violation
  }

  if (!newId) {
    redirectWithFlash(
      LIST_PATH,
      `Couldn't save the draft: ${insertError ?? "unknown error"}`,
      "error",
    );
  }
  revalidatePath(LIST_PATH);
  redirect(`${LIST_PATH}/${newId}?flash=${encodeURIComponent("Draft generated — review every fact before publishing.")}&flash_tone=success`);
}

/**
 * Creates an empty hand-written draft (agent guides and other pieces that
 * aren't project-grounded) and opens it in the editor.
 */
export async function createBlankArticle(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const title = String(formData.get("title") ?? "").trim();
  const articleType = String(formData.get("article_type") ?? "agent_guide");
  if (!title) {
    redirectWithFlash(LIST_PATH, "Give the article a working title.", "error");
  }
  if (!TYPE_VALUES.includes(articleType as ArticleType)) {
    redirectWithFlash(LIST_PATH, "Pick an article type.", "error");
  }

  const baseSlug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9-\s]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 100) || "untitled";
  let newId: string | null = null;
  for (const slug of [
    baseSlug.length >= 3 ? baseSlug : `${baseSlug}-draft`,
    `${baseSlug}-${Date.now().toString(36).slice(-4)}`.slice(0, 120),
  ]) {
    const { data, error } = await supabase
      .from("articles")
      .insert({
        slug,
        status: "draft",
        article_type: articleType,
        title,
        body_md: "",
        generated_by_ai: false,
      })
      .select("id")
      .maybeSingle();
    if (!error && data) {
      newId = data.id as string;
      break;
    }
    if (error?.code !== "23505") break;
  }
  if (!newId) {
    redirectWithFlash(LIST_PATH, "Couldn't create the draft.", "error");
  }
  revalidatePath(LIST_PATH);
  redirect(`${LIST_PATH}/${newId}`);
}

/** Saves editor changes. Never touches status — the status buttons own that. */
export async function updateArticle(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const id = String(formData.get("article_id") ?? "");
  if (!id) redirectWithFlash(LIST_PATH, "Missing article.", "error");

  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  const title = String(formData.get("title") ?? "").trim();
  if (!title || slug.length < 3) {
    redirectWithFlash(
      `${LIST_PATH}/${id}`,
      "A title and a slug of at least 3 characters are required.",
      "error",
    );
  }

  const { error } = await supabase
    .from("articles")
    .update({
      title,
      slug,
      excerpt: String(formData.get("excerpt") ?? "").trim() || null,
      body_md: String(formData.get("body_md") ?? ""),
      seo_title: String(formData.get("seo_title") ?? "").trim() || null,
      seo_meta_description:
        String(formData.get("seo_meta_description") ?? "").trim() || null,
      hero_image_url:
        String(formData.get("hero_image_url") ?? "").trim() || null,
      indexable: formData.get("indexable") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath(LIST_PATH);
  revalidatePath("/insights");
  if (error) {
    redirectWithFlash(
      `${LIST_PATH}/${id}`,
      error.code === "23505"
        ? "That slug is already taken by another article."
        : `Couldn't save: ${error.message}`,
      "error",
    );
  }
  redirectWithFlash(`${LIST_PATH}/${id}`, "Saved.");
}

const STATUSES = ["draft", "in_review", "published", "archived"] as const;

/** Moves an article through draft → in_review → published → archived. */
export async function setArticleStatus(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const id = String(formData.get("article_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const backTo = String(formData.get("back_to") ?? "") === "editor"
    ? `${LIST_PATH}/${id}`
    : LIST_PATH;
  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    redirectWithFlash(LIST_PATH, "Invalid status change.", "error");
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "published") {
    // First publish stamps the byline date; re-publishing keeps it.
    const { data: existing } = await supabase
      .from("articles")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();
    if (!existing?.published_at) patch.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("articles").update(patch).eq("id", id);

  revalidatePath(LIST_PATH);
  revalidatePath("/insights");
  if (error) {
    redirectWithFlash(backTo, `Couldn't update status: ${error.message}`, "error");
  }
  redirectWithFlash(
    backTo,
    status === "published"
      ? "Published — the article is live at /insights."
      : `Moved to ${status.replace("_", " ")}.`,
  );
}

/** Hard delete — for drafts that aren't worth keeping. */
export async function deleteArticle(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const id = String(formData.get("article_id") ?? "");
  if (!id) redirectWithFlash(LIST_PATH, "Missing article.", "error");

  const { error } = await supabase.from("articles").delete().eq("id", id);
  revalidatePath(LIST_PATH);
  revalidatePath("/insights");
  if (error) {
    redirectWithFlash(LIST_PATH, `Couldn't delete: ${error.message}`, "error");
  }
  redirectWithFlash(LIST_PATH, "Article deleted.");
}
