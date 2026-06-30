"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { maybeGenerateSeoOnPublish } from "@/lib/seo";

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

// Tri-state boolean from a Select: "" -> null (unknown), "true"/"false".
function bool(v: FormDataEntryValue | null): boolean | null {
  const s = String(v ?? "");
  if (s === "true") return true;
  if (s === "false") return false;
  return null;
}

/** Edits canonical project fields (admin-only). */
export async function updateProject(formData: FormData) {
  const id = String(formData.get("project_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("projects")
    .update({
      project_name: str(formData.get("project_name")) ?? "Untitled",
      builder_name: str(formData.get("builder_name")),
      city: str(formData.get("city")) ?? "Unknown",
      description_short: str(formData.get("description_short")),
      description_long: str(formData.get("description_long")),
      sales_status: str(formData.get("sales_status")),
      construction_status: str(formData.get("construction_status")),
      listing_type: str(formData.get("listing_type")) ?? "for_sale",
      price_period: str(formData.get("price_period")) ?? "total",
      occupancy_estimate_text: str(formData.get("occupancy_estimate_text")),
      price_from_public: num(formData.get("price_from_public")),
      price_to_public: num(formData.get("price_to_public")),
      hero_image_url: str(formData.get("hero_image_url")),
      record_status: str(formData.get("record_status")) ?? "draft",
      is_featured: formData.get("is_featured") === "on",
    })
    .eq("id", id);

  revalidatePath(`/dashboard/admin/projects/${id}`);
  revalidatePath("/dashboard/admin/projects");
}

/**
 * Upserts the broker-only commission/negotiability terms (admin-only).
 * Approved brokers read these via RLS; only admins (and, later, a scoped
 * verified-builder role) write them.
 */
export async function saveCommercials(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase.from("project_private_commercials").upsert(
    {
      project_id: projectId,
      commission_summary: str(formData.get("commission_summary")),
      commission_percent: num(formData.get("commission_percent")),
      commission_is_negotiable: bool(formData.get("commission_is_negotiable")),
      price_is_negotiable: bool(formData.get("price_is_negotiable")),
      incentives_are_negotiable: bool(formData.get("incentives_are_negotiable")),
      negotiability_notes: str(formData.get("negotiability_notes")),
      private_incentive_notes: str(formData.get("private_incentive_notes")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
}

/** Creates/updates the public publishing layer for a project (admin-only). */
export async function savePublicPage(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const slug = str(formData.get("slug"));
  if (!projectId || !slug) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const { error } = await supabase.from("public_project_pages").upsert(
    {
      project_id: projectId,
      slug,
      assigned_realtor_profile_id: str(
        formData.get("assigned_realtor_profile_id"),
      ),
      seo_title: str(formData.get("seo_title")),
      seo_meta_description: str(formData.get("seo_meta_description")),
      page_summary: str(formData.get("page_summary")),
      page_description: str(formData.get("page_description")),
      section_intro: str(formData.get("section_intro")),
      section_amenities: str(formData.get("section_amenities")),
      section_getting_around: str(formData.get("section_getting_around")),
      section_developer: str(formData.get("section_developer")),
      indexable: formData.get("indexable") === "on",
    },
    { onConflict: "project_id" },
  );

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  // Surface failures instead of silently no-op'ing (the old behaviour).
  if (error) {
    redirect(
      `/dashboard/admin/projects/${projectId}?error=` +
        encodeURIComponent(`Could not save the public page — ${error.message}`),
    );
  }
  redirect(`/dashboard/admin/projects/${projectId}?message=public-saved`);
}

/**
 * Publishes the public project page. Sets all three flags the public view
 * requires: projects.public_page_enabled + record_status='published' and
 * public_project_pages.is_active. Admin-only.
 */
export async function publishProject(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const now = new Date().toISOString();

  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  const { data: page } = await supabase
    .from("public_project_pages")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (page) {
    await supabase
      .from("public_project_pages")
      .update({ is_active: true, published_at: now })
      .eq("project_id", projectId);
  } else {
    await supabase.from("public_project_pages").insert({
      project_id: projectId,
      slug: project.slug,
      is_active: true,
      published_at: now,
    });
  }

  await supabase
    .from("projects")
    .update({
      public_page_enabled: true,
      record_status: "published",
      published_at: now,
    })
    .eq("id", projectId);

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  revalidatePath("/dashboard/admin/projects");

  // SEO autofill is a slow LLM call (several seconds). Run it AFTER the
  // response so publishing is instant. It only fills empty fields and never
  // throws; the service-role client is used since the request is finished.
  after(async () => {
    await maybeGenerateSeoOnPublish(projectId, createAdminClient());
    revalidatePath(`/dashboard/admin/projects/${projectId}`);
  });
}

/** Unpublishes the public page (removes it from the public view). Admin-only. */
export async function unpublishProject(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("public_project_pages")
    .update({ is_active: false })
    .eq("project_id", projectId);

  await supabase
    .from("projects")
    .update({ public_page_enabled: false })
    .eq("id", projectId);

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  revalidatePath("/dashboard/admin/projects");
}

/**
 * Upserts a project's purpose-built-rental (PBR) referral terms (admin-only).
 * Approved realtors read these via RLS; published rental projects that accept
 * referrals surface in the broker-only referral_opportunities_view feed.
 */
export async function saveRentalReferralTerms(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase.from("project_rental_referral_terms").upsert(
    {
      project_id: projectId,
      accepts_referrals: formData.get("accepts_referrals") === "on",
      referral_fee_type: str(formData.get("referral_fee_type")),
      referral_fee_value: num(formData.get("referral_fee_value")),
      referral_fee_notes: str(formData.get("referral_fee_notes")),
      payout_terms: str(formData.get("payout_terms")),
      min_lease_term_months: num(formData.get("min_lease_term_months")),
      min_household_income: num(formData.get("min_household_income")),
      min_credit_band: str(formData.get("min_credit_band")),
      pets_allowed: bool(formData.get("pets_allowed")),
      earliest_move_in: str(formData.get("earliest_move_in")),
      latest_move_in: str(formData.get("latest_move_in")),
      service_mode: str(formData.get("service_mode")) ?? "self_serve",
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
}

/** Adds a broker portal link to a project (admin-only). */
export async function addBrokerPortal(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const portalName = str(formData.get("portal_name"));
  if (!projectId || !portalName) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase.from("project_broker_portals").insert({
    project_id: projectId,
    portal_name: portalName,
    portal_type: str(formData.get("portal_type")) ?? "external_url",
    url: str(formData.get("url")),
    access_notes: str(formData.get("access_notes")),
    is_primary: formData.get("is_primary") === "on",
    is_featured: formData.get("is_featured") === "on",
    is_active: true,
    added_by_user_id: adminId,
  });

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  revalidatePath("/dashboard/broker-portals");
}

/** Removes a broker portal (admin-only). */
export async function removeBrokerPortal(formData: FormData) {
  const id = String(formData.get("portal_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase.from("project_broker_portals").delete().eq("id", id);

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  revalidatePath("/dashboard/broker-portals");
}

/** Approves a realtor-suggested broker portal, making it live (admin-only). */
export async function approveBrokerPortal(formData: FormData) {
  const id = String(formData.get("portal_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);
  await supabase
    .from("project_broker_portals")
    .update({
      status: "approved",
      is_active: true,
      approved_by_user_id: adminId,
    })
    .eq("id", id);

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  revalidatePath("/dashboard/broker-portals");
}

/** Rejects a realtor-suggested broker portal (admin-only). */
export async function rejectBrokerPortal(formData: FormData) {
  const id = String(formData.get("portal_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);
  await supabase
    .from("project_broker_portals")
    .update({
      status: "rejected",
      is_active: false,
      approved_by_user_id: adminId,
    })
    .eq("id", id);

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  revalidatePath("/dashboard/broker-portals");
}

/** Toggles a broker portal's featured (paid-placement) flag (admin-only). */
export async function setBrokerPortalFeatured(formData: FormData) {
  const id = String(formData.get("portal_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const featured = formData.get("is_featured") === "true";
  if (!id) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase
    .from("project_broker_portals")
    .update({ is_featured: featured })
    .eq("id", id);

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  revalidatePath("/dashboard/broker-portals");
}
