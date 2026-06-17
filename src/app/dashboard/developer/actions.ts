"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotifications } from "@/lib/notifications";
import { HIDEABLE_FIELDS } from "@/lib/opportunities";

const HIDEABLE_KEYS = HIDEABLE_FIELDS.map((f) => f.key) as string[];

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

/** Reads the per-field privacy checkboxes into a clean hidden_fields array. */
function hiddenFields(formData: FormData): string[] {
  return formData
    .getAll("hidden_fields")
    .map(String)
    .filter((k) => HIDEABLE_KEYS.includes(k));
}

async function requireDeveloper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "developer" && profile?.role !== "admin") {
    redirect("/dashboard");
  }
  return { supabase, userId: user.id };
}

const editableFields = (formData: FormData) => {
  const deal_type = String(formData.get("deal_type") ?? "single_property");
  const price_basis = String(formData.get("price_basis") ?? "total");
  return {
    title: str(formData, "title"),
    deal_type: ["single_property", "units", "portfolio"].includes(deal_type)
      ? deal_type
      : "single_property",
    summary: str(formData, "summary"),
    city: str(formData, "city"),
    province: str(formData, "province") ?? "Ontario",
    unit_count: num(formData, "unit_count"),
    asking_price: num(formData, "asking_price"),
    price_basis: ["total", "per_unit"].includes(price_basis)
      ? price_basis
      : "total",
    commission_percent: num(formData, "commission_percent"),
    incentive_amount: num(formData, "incentive_amount"),
    incentive_notes: str(formData, "incentive_notes"),
    address_full: str(formData, "address_full"),
    internal_notes: str(formData, "internal_notes"),
    hidden_fields: hiddenFields(formData),
  };
};

/** Creates a new opportunity in DRAFT and opens its manage page. */
export async function createOpportunity(formData: FormData) {
  const { supabase, userId } = await requireDeveloper();
  const fields = editableFields(formData);

  if (!fields.title) {
    redirect(
      "/dashboard/developer/new?error=" +
        encodeURIComponent("A deal title is required."),
    );
  }

  const { data, error } = await supabase
    .from("opportunities")
    .insert({ developer_id: userId, status: "draft", ...fields })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      "/dashboard/developer/new?error=" +
        encodeURIComponent("Could not create the deal. Please try again."),
    );
  }
  redirect(`/dashboard/developer/${data.id}?message=created`);
}

/** Updates an opportunity's terms + field-visibility (owner only via RLS). */
export async function updateOpportunity(formData: FormData) {
  const { supabase } = await requireDeveloper();
  const id = String(formData.get("opportunity_id") ?? "");
  if (!id) return;

  const fields = editableFields(formData);
  if (!fields.title) {
    redirect(
      `/dashboard/developer/${id}?error=` +
        encodeURIComponent("A deal title is required."),
    );
  }

  await supabase.from("opportunities").update(fields).eq("id", id);
  revalidatePath(`/dashboard/developer/${id}`);
  redirect(`/dashboard/developer/${id}?message=saved`);
}

/**
 * Moves an opportunity between draft / open / paused / closed. The first time it
 * goes live it stamps published_at and fans a notification out to every
 * approved realtor — wiring the deal into the realtor notifications portal.
 */
export async function setOpportunityStatus(formData: FormData) {
  const { supabase } = await requireDeveloper();
  const id = String(formData.get("opportunity_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["open", "paused", "closed", "draft"].includes(status)) return;

  const { data: existing } = await supabase
    .from("opportunities")
    .select("id, title, published_at, status")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return;

  const firstPublish = status === "open" && !existing.published_at;

  const patch: Record<string, unknown> = { status };
  if (firstPublish) patch.published_at = new Date().toISOString();

  await supabase.from("opportunities").update(patch).eq("id", id);

  if (firstPublish) {
    // Fan-out to approved realtors via the service-role client.
    const admin = createAdminClient();
    const { data: realtors } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "realtor")
      .eq("verification_status", "approved");

    await createNotifications(
      (realtors ?? []).map((r) => ({
        user_id: r.id as string,
        type: "new_opportunity",
        title: "New opportunity available",
        body: existing.title,
        link_url: `/dashboard/opportunities/${id}`,
        opportunity_id: id,
      })),
    );
  }

  revalidatePath(`/dashboard/developer/${id}`);
  revalidatePath("/dashboard/developer");
  redirect(`/dashboard/developer/${id}?message=status`);
}

/** Permanently deletes a draft opportunity (owner only). */
export async function deleteOpportunity(formData: FormData) {
  const { supabase } = await requireDeveloper();
  const id = String(formData.get("opportunity_id") ?? "");
  if (!id) return;
  await supabase
    .from("opportunities")
    .delete()
    .eq("id", id)
    .eq("status", "draft");
  redirect("/dashboard/developer?message=deleted");
}

/** Adds a property/unit to an opportunity. */
export async function addUnit(formData: FormData) {
  const { supabase } = await requireDeveloper();
  const id = String(formData.get("opportunity_id") ?? "");
  const label = str(formData, "label");
  if (!id || !label) {
    redirect(
      `/dashboard/developer/${id}?error=` +
        encodeURIComponent("A unit label is required."),
    );
  }
  const status = String(formData.get("status") ?? "available");
  await supabase.from("opportunity_units").insert({
    opportunity_id: id,
    label,
    unit_type: str(formData, "unit_type"),
    beds: num(formData, "beds"),
    baths: num(formData, "baths"),
    sqft: num(formData, "sqft"),
    asking_price: num(formData, "asking_price"),
    address_full: str(formData, "address_full"),
    internal_notes: str(formData, "internal_notes"),
    status: ["available", "pending", "sold", "withdrawn"].includes(status)
      ? status
      : "available",
    sort_order: num(formData, "sort_order") ?? 0,
  });
  revalidatePath(`/dashboard/developer/${id}`);
  redirect(`/dashboard/developer/${id}?message=unit_added`);
}

/** Removes a property/unit from an opportunity. */
export async function deleteUnit(formData: FormData) {
  const { supabase } = await requireDeveloper();
  const id = String(formData.get("opportunity_id") ?? "");
  const unitId = String(formData.get("unit_id") ?? "");
  if (!unitId) return;
  await supabase.from("opportunity_units").delete().eq("id", unitId);
  revalidatePath(`/dashboard/developer/${id}`);
  redirect(`/dashboard/developer/${id}?message=unit_removed`);
}

/**
 * Developer responds to a realtor bid: accept / decline / counter. Notifies the
 * bidding realtor so the negotiation shows up in their notifications portal.
 */
export async function respondToBid(formData: FormData) {
  const { supabase, userId } = await requireDeveloper();
  const id = String(formData.get("opportunity_id") ?? "");
  const bidId = String(formData.get("bid_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const response = str(formData, "developer_response");
  if (!bidId || !["accepted", "declined", "countered"].includes(decision)) {
    return;
  }

  const { data: bid } = await supabase
    .from("opportunity_bids")
    .select("id, realtor_id, opportunity_id")
    .eq("id", bidId)
    .maybeSingle();
  if (!bid) return;

  await supabase
    .from("opportunity_bids")
    .update({
      status: decision,
      developer_response: response,
      responded_by_user_id: userId,
      responded_at: new Date().toISOString(),
    })
    .eq("id", bidId);

  const labels: Record<string, string> = {
    accepted: "Your bid was accepted",
    declined: "Your bid was declined",
    countered: "The developer countered your bid",
  };
  await createNotifications([
    {
      user_id: bid.realtor_id as string,
      type: `bid_${decision}`,
      title: labels[decision],
      body: response ?? undefined,
      link_url: `/dashboard/opportunities/${id}`,
      opportunity_id: id,
      bid_id: bidId,
    },
  ]);

  revalidatePath(`/dashboard/developer/${id}`);
  redirect(`/dashboard/developer/${id}?message=responded`);
}
