"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const BASE = "/dashboard/assignments";

const CONSENT_STATUSES = [
  "unknown",
  "not_required",
  "consent_pending",
  "consent_obtained",
  "assignment_prohibited",
];
const LIFECYCLE = [
  "active",
  "under_contract",
  "assigned",
  "withdrawn",
  "expired",
];

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
function num(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s === null) return null;
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function intOrNull(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n === null ? null : Math.trunc(n);
}

type ParsedAssignment = {
  project_id: string | null;
  project_name: string;
  city_region: string;
  unit_label: string | null;
  beds: number | null;
  baths: number | null;
  size_sqft: number | null;
  exposure: string | null;
  parking: number | null;
  locker: boolean;
  original_purchase_price: number | null;
  assignment_price: number;
  deposit_paid_to_date: number | null;
  co_op_commission_note: string | null;
  occupancy_estimate: string | null;
  final_closing_estimate: string | null;
  builder_consent_status: string;
  builder_assignment_fee: number | null;
  notes: string | null;
  status: string;
  realtor_name: string;
  brokerage_name: string;
  contact_phone: string;
  contact_email: string;
  rights_confirmed_at: string;
};

function parse(fd: FormData): { row?: ParsedAssignment; error?: string } {
  const project_name = str(fd, "project_name");
  const city_region = str(fd, "city_region");
  const assignment_price = num(fd, "assignment_price");
  const rights = fd.get("rights_confirmed") === "on";

  if (!project_name) return { error: "The project name is required." };
  if (!city_region) return { error: "A city or region is required." };
  if (assignment_price === null)
    return { error: "An assignment price is required." };
  if (!rights)
    return {
      error:
        "Please confirm you have the right to market this assignment before posting.",
    };

  const realtor_name = str(fd, "realtor_name");
  const brokerage_name = str(fd, "brokerage_name");
  const contact_phone = str(fd, "contact_phone");
  const contact_email = str(fd, "contact_email");
  if (!realtor_name || !brokerage_name || !contact_phone || !contact_email)
    return {
      error:
        "Your name, brokerage, phone, and email are required so other agents can reach you.",
    };

  const consentRaw = str(fd, "builder_consent_status") ?? "unknown";
  const builder_consent_status = CONSENT_STATUSES.includes(consentRaw)
    ? consentRaw
    : "unknown";
  const statusRaw = str(fd, "status") ?? "active";
  const status = LIFECYCLE.includes(statusRaw) ? statusRaw : "active";

  // A LIQWD project id may be passed to link the listing to the catalogue; it
  // is validated to a uuid shape (RLS + FK are the real backstop).
  const projectIdRaw = str(fd, "project_id");
  const project_id =
    projectIdRaw &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      projectIdRaw,
    )
      ? projectIdRaw
      : null;

  return {
    row: {
      project_id,
      project_name,
      city_region,
      unit_label: str(fd, "unit_label"),
      beds: num(fd, "beds"),
      baths: num(fd, "baths"),
      size_sqft: intOrNull(fd, "size_sqft"),
      exposure: str(fd, "exposure"),
      parking: intOrNull(fd, "parking"),
      locker: fd.get("locker") === "on",
      original_purchase_price: num(fd, "original_purchase_price"),
      assignment_price,
      deposit_paid_to_date: num(fd, "deposit_paid_to_date"),
      co_op_commission_note: str(fd, "co_op_commission_note"),
      occupancy_estimate: str(fd, "occupancy_estimate"),
      final_closing_estimate: str(fd, "final_closing_estimate"),
      builder_consent_status,
      builder_assignment_fee: num(fd, "builder_assignment_fee"),
      notes: str(fd, "notes"),
      status,
      realtor_name,
      brokerage_name,
      contact_phone,
      contact_email,
      rights_confirmed_at: new Date().toISOString(),
    },
  };
}

/** Shared gate: approved realtors (and admins). RLS is the real backstop. */
async function requireApprovedRealtor() {
  const { userId, profile } = await requireUserProfile();
  if (!isAdmin(profile) && (profile.role !== "realtor" || !isApproved(profile))) {
    redirect("/dashboard");
  }
  return { userId, profile };
}

export async function createAssignment(formData: FormData) {
  const { userId } = await requireApprovedRealtor();
  const { row, error } = parse(formData);
  if (error || !row) {
    redirect(`${BASE}/new?error=` + encodeURIComponent(error ?? "Invalid form."));
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("assignment_listings")
    .insert({ realtor_id: userId, ...row });
  if (dbError) {
    redirect(
      `${BASE}/new?error=` +
        encodeURIComponent("Could not post the assignment. Please try again."),
    );
  }
  revalidatePath(BASE);
  redirect(`${BASE}?created=1`);
}

export async function updateAssignment(formData: FormData) {
  await requireApprovedRealtor();
  const id = str(formData, "id");
  if (!id) redirect(BASE);
  const { row, error } = parse(formData);
  if (error || !row) {
    redirect(
      `${BASE}/${id}/edit?error=` + encodeURIComponent(error ?? "Invalid form."),
    );
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("assignment_listings")
    .update(row)
    .eq("id", id);
  if (dbError) {
    redirect(
      `${BASE}/${id}/edit?error=` +
        encodeURIComponent("Could not save changes. Please try again."),
    );
  }
  revalidatePath(BASE);
  redirect(`${BASE}?updated=1`);
}

export async function deleteAssignment(formData: FormData) {
  await requireApprovedRealtor();
  const id = str(formData, "id");
  if (!id) redirect(BASE);
  const supabase = await createClient();
  await supabase.from("assignment_listings").delete().eq("id", id);
  revalidatePath(BASE);
  redirect(`${BASE}?deleted=1`);
}
