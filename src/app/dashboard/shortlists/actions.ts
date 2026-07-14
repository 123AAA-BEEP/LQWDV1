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

// ---------------------------------------------------------------------------
// Agent-supplied project depth (the buyer-portal layer).
//  - NOTES key to (agent, project): the agent's own voice (incentive, deposit,
//    client note), shown only on THAT agent's shortlists.
//  - FILES key to the PROJECT (project_documents): a floor plan is a fact
//    about the project, so one agent's upload becomes a community asset every
//    LIQWD agent can use. Buyer exposure requires source_type='realtor_share'
//    + the rights confirmation — admin docs in the same table never reach
//    buyers.
// ---------------------------------------------------------------------------

const FILES_PER_PROJECT = 10;
const SHARE_SOURCE = "realtor_share";
const DOC_TYPES = ["floor_plan", "brochure", "price_sheet", "other"] as const;

/** Saves the agent's incentive / deposit / note text for one project. */
export async function saveProjectDetails(formData: FormData) {
  const collection_id = String(formData.get("collection_id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!project_id) redirect(COLLECTIONS);
  const backTo = `${COLLECTIONS}?c=${collection_id}&item=${project_id}`;

  const incentive =
    String(formData.get("incentive_note") ?? "").trim().slice(0, 500) || null;
  const deposit =
    String(formData.get("deposit_note") ?? "").trim().slice(0, 500) || null;
  const extra =
    String(formData.get("extra_note") ?? "").trim().slice(0, 1000) || null;

  const { profile } = await requireUserProfile();
  if (profile.role !== "realtor") redirect("/dashboard");
  const supabase = await createClient();

  await supabase.from("agent_project_notes").upsert(
    {
      profile_id: profile.id,
      project_id,
      incentive_note: incentive,
      deposit_note: deposit,
      extra_note: extra,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,project_id" },
  );
  revalidatePath(COLLECTIONS);
  redirect(`${backTo}&message=details-saved`);
}

/**
 * Records an uploaded material (the file itself went browser-direct to the
 * private project-documents bucket) as a PROJECT document every approved
 * realtor can reuse. Client-invoked, so it returns { error } for the
 * component's own error surface rather than redirecting. The cap is per-agent
 * (your OWN uploads), so one agent can never lock others out; on any rejection
 * the just-uploaded object is removed so nothing is orphaned in the bucket.
 */
export async function recordMaterial(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const project_id = String(formData.get("project_id") ?? "");
  const path = String(formData.get("path") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 80);
  const kindRaw = String(formData.get("kind") ?? "");
  const kind = (DOC_TYPES as readonly string[]).includes(kindRaw)
    ? kindRaw
    : "other";
  const rights = String(formData.get("rights") ?? "") === "on";

  const { profile } = await requireUserProfile();
  const supabase = await createClient();
  const cleanup = async () => {
    if (path) await supabase.storage.from("project-documents").remove([path]);
  };

  if (profile.role !== "realtor") {
    await cleanup();
    return { error: "Only realtor accounts can share materials." };
  }
  if (!project_id || !path) return { error: "Upload failed. Please try again." };
  if (!rights) {
    await cleanup();
    return { error: "Please confirm you have the right to share this material." };
  }
  // The path must sit in THIS agent's folder for THIS project — the same shape
  // the DB insert policy (0071) now enforces, checked here too to fail fast
  // and clean up before the round trip. A non-empty file segment is required.
  const prefix = `${project_id}/broker-${profile.id}/`;
  if (!path.startsWith(prefix) || path.length <= prefix.length) {
    await cleanup();
    return { error: "Upload failed. Please try again." };
  }

  // Per-agent cap on YOUR OWN shared uploads for this project.
  const { count } = await supabase
    .from("project_documents")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id)
    .eq("source_type", SHARE_SOURCE)
    .eq("uploaded_by_user_id", profile.id);
  if ((count ?? 0) >= FILES_PER_PROJECT) {
    await cleanup();
    return {
      error: `You can share up to ${FILES_PER_PROJECT} files per project. Remove one of yours first.`,
    };
  }

  const { error } = await supabase.from("project_documents").insert({
    project_id,
    document_type: kind,
    title: label || "Document",
    file_url: path,
    is_public: false,
    source_type: SHARE_SOURCE,
    uploaded_by_user_id: profile.id,
    rights_confirmed_at: new Date().toISOString(),
  });
  if (error) {
    await cleanup();
    return { error: "Couldn't save the file. Please try again." };
  }
  revalidatePath(COLLECTIONS);
}

export async function removeMaterial(formData: FormData) {
  const id = String(formData.get("file_id") ?? "");
  const collection_id = String(formData.get("collection_id") ?? "");
  const project_id = String(formData.get("project_id") ?? "");
  if (!id) redirect(COLLECTIONS);
  const { profile } = await requireUserProfile();
  const supabase = await createClient();

  // Delete + return the path in one round trip (also closes the select/delete
  // race). RLS already restricts this to the uploader's own realtor_share
  // rows; the filters here make that explicit.
  const { data: row } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", id)
    .eq("uploaded_by_user_id", profile.id)
    .eq("source_type", SHARE_SOURCE)
    .select("file_url")
    .maybeSingle();
  if (row?.file_url) {
    await supabase.storage.from("project-documents").remove([row.file_url]);
  }
  revalidatePath(COLLECTIONS);
  redirect(
    `${COLLECTIONS}${collection_id ? `?c=${collection_id}&item=${project_id}&message=file-removed` : ""}`,
  );
}
