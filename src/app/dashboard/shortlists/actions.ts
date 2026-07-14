"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserProfile } from "@/lib/auth";

/**
 * Shortlists — "5 projects for the Smiths". (DB tables keep their original
 * client_collections names; only the product surface is renamed.) Owner-scoped by RLS; the
 * public micro-page (/c/{token}) is capability-addressed by the token, so
 * revoking flips the link dead instantly. Caps keep pages personal, not
 * catalogues.
 */

const COLLECTIONS = "/dashboard/shortlists";
const COLLECTION_LIMIT = 20;
const ITEM_LIMIT = 12;

function fail(msg: string, id?: string): never {
  const suffix = id ? `&c=${id}` : "";
  redirect(`${COLLECTIONS}?error=${encodeURIComponent(msg)}${suffix}`);
}

export async function createCollection(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  if (!title) fail("Give the shortlist a name — usually your client's.");

  const { profile } = await requireUserProfile();
  if (profile.role !== "realtor") redirect("/dashboard");
  const supabase = await createClient();

  const { count } = await supabase
    .from("client_collections")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .is("revoked_at", null);
  if ((count ?? 0) >= COLLECTION_LIMIT) {
    fail(`You can keep up to ${COLLECTION_LIMIT} active shortlists — revoke one first.`);
  }

  const token = randomBytes(9).toString("base64url");
  const { data, error } = await supabase
    .from("client_collections")
    .insert({ profile_id: profile.id, token, title, note })
    .select("id")
    .maybeSingle();
  if (error || !data) fail("Couldn't create the shortlist. Please try again.");
  revalidatePath(COLLECTIONS);
  redirect(`${COLLECTIONS}?c=${data.id}&message=created`);
}

export async function addCollectionItem(formData: FormData) {
  const collection_id = String(formData.get("collection_id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!collection_id || !project_id) redirect(COLLECTIONS);

  const { profile } = await requireUserProfile();
  const supabase = await createClient();

  // RLS guards ownership; the count keeps it a hand-picked page.
  const { count } = await supabase
    .from("client_collection_items")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", collection_id);
  if ((count ?? 0) >= ITEM_LIMIT) {
    fail(`Shortlists hold up to ${ITEM_LIMIT} projects.`, collection_id);
  }

  await supabase.from("client_collection_items").insert({
    collection_id,
    project_id,
    sort_order: (count ?? 0) + 1,
  });
  void profile;
  revalidatePath(COLLECTIONS);
  redirect(`${COLLECTIONS}?c=${collection_id}&message=added`);
}

export async function removeCollectionItem(formData: FormData) {
  const id = String(formData.get("item_id") ?? "");
  const collection_id = String(formData.get("collection_id") ?? "");
  if (!id) redirect(COLLECTIONS);
  await requireUserProfile();
  const supabase = await createClient();
  await supabase.from("client_collection_items").delete().eq("id", id);
  revalidatePath(COLLECTIONS);
  redirect(`${COLLECTIONS}${collection_id ? `?c=${collection_id}&message=removed` : ""}`);
}

/** Revoke = the shared link stops resolving immediately. Reversible. */
export async function setCollectionRevoked(formData: FormData) {
  const id = String(formData.get("collection_id") ?? "");
  const revoke = String(formData.get("revoke") ?? "") === "1";
  if (!id) redirect(COLLECTIONS);
  const { profile } = await requireUserProfile();
  const supabase = await createClient();
  await supabase
    .from("client_collections")
    .update({ revoked_at: revoke ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("profile_id", profile.id);
  revalidatePath(COLLECTIONS);
  redirect(`${COLLECTIONS}?c=${id}&message=${revoke ? "revoked" : "restored"}`);
}

export async function deleteCollection(formData: FormData) {
  const id = String(formData.get("collection_id") ?? "");
  if (!id) redirect(COLLECTIONS);
  const { profile } = await requireUserProfile();
  const supabase = await createClient();
  await supabase
    .from("client_collections")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);
  revalidatePath(COLLECTIONS);
  redirect(`${COLLECTIONS}?message=deleted`);
}
