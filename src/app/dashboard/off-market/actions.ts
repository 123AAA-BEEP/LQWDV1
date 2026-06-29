"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { pathFromPublicUrl } from "@/lib/upload";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/types";

const BASE = "/dashboard/off-market";
const BUCKET = "off-market-media";

const PRICE_TYPES = [
  "flat_price",
  "price_per_sqft",
  "price_per_acre",
  "price_per_unit",
];
const LISTING_STATUSES = ["for_sale", "for_lease", "for_sale_and_lease"];
const SIZE_TYPES = ["square_footage", "acreage", "unit_count"];

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

/** The validated, DB-ready shape of a listing form (minus realtor_id). */
type ParsedListing = {
  title: string;
  price: number;
  price_type: string;
  listing_status: string;
  property_types: PropertyType[];
  city_region: string;
  address: string | null;
  property_type_description: string | null;
  size_value: number | null;
  size_type: string | null;
  image_urls: string[];
  realtor_name: string;
  realtor_title: string | null;
  brokerage_name: string;
  contact_phone: string;
  contact_email: string;
};

/** Parses + validates the form. Returns the row, or a user-facing error string. */
function parseListing(fd: FormData): { row?: ParsedListing; error?: string } {
  const title = str(fd, "title");
  const price = num(fd, "price");
  const price_type = str(fd, "price_type");
  const listing_status = str(fd, "listing_status");
  const property_types = fd
    .getAll("property_types")
    .filter((v): v is string => typeof v === "string")
    .filter((v): v is PropertyType =>
      PROPERTY_TYPES.includes(v as PropertyType),
    );
  const city_region = str(fd, "city_region");

  if (!title) return { error: "A listing title is required." };
  if (price === null) return { error: "A price is required." };
  if (!price_type || !PRICE_TYPES.includes(price_type))
    return { error: "Choose a valid price type." };
  if (!listing_status || !LISTING_STATUSES.includes(listing_status))
    return { error: "Choose a valid listing status." };
  if (property_types.length === 0)
    return { error: "Select at least one property type." };
  if (!city_region) return { error: "A city or region is required." };

  // Size is all-or-nothing (mirrors the DB check constraint).
  const size_value = num(fd, "size_value");
  const size_type_raw = str(fd, "size_type");
  const size_type =
    size_type_raw && SIZE_TYPES.includes(size_type_raw) ? size_type_raw : null;
  if (size_value !== null && !size_type)
    return { error: "Choose a size unit (sq ft, acres, or units) for the size." };
  if (size_value === null && size_type)
    return { error: "Enter a size value to go with the size unit." };

  // Only keep image URLs that actually point at our off-market bucket.
  const image_urls = fd
    .getAll("image_urls")
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .filter((url) => pathFromPublicUrl(url, BUCKET) !== null);

  // Contact snapshot comes from the (profile-prefilled) form fields.
  const realtor_name = str(fd, "realtor_name");
  const brokerage_name = str(fd, "brokerage_name");
  const contact_phone = str(fd, "contact_phone");
  const contact_email = str(fd, "contact_email");
  if (!realtor_name || !brokerage_name || !contact_phone || !contact_email)
    return {
      error:
        "Your name, brokerage, phone, and email are required so other agents can reach you.",
    };

  return {
    row: {
      title,
      price,
      price_type,
      listing_status,
      property_types,
      city_region,
      address: str(fd, "address"),
      property_type_description: str(fd, "property_type_description"),
      size_value,
      size_type,
      image_urls,
      realtor_name,
      realtor_title: str(fd, "realtor_title"),
      brokerage_name,
      contact_phone,
      contact_email,
    },
  };
}

/** Poster gate shared by every action: approved realtors or admins (the
 * owner). RLS is the real backstop. */
async function requireApprovedRealtor() {
  const { userId, profile } = await requireUserProfile();
  if (!isAdmin(profile) && (profile.role !== "realtor" || !isApproved(profile))) {
    redirect("/dashboard");
  }
  return { userId, profile };
}

/** Creates an off-market listing owned by the current realtor. */
export async function createListing(formData: FormData) {
  const { userId } = await requireApprovedRealtor();

  const { row, error } = parseListing(formData);
  if (error || !row) {
    redirect(`${BASE}/new?error=` + encodeURIComponent(error ?? "Invalid form."));
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("off_market_listings")
    .insert({ realtor_id: userId, ...row });

  if (dbError) {
    redirect(
      `${BASE}/new?error=` +
        encodeURIComponent("Could not post the listing. Please try again."),
    );
  }

  revalidatePath(BASE);
  redirect(`${BASE}?created=1`);
}

/** Updates a listing the current realtor owns (RLS enforces ownership). */
export async function updateListing(formData: FormData) {
  await requireApprovedRealtor();
  const id = str(formData, "id");
  if (!id) redirect(BASE);

  const { row, error } = parseListing(formData);
  if (error || !row) {
    redirect(
      `${BASE}/${id}/edit?error=` +
        encodeURIComponent(error ?? "Invalid form."),
    );
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("off_market_listings")
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

/** Deletes a listing the current realtor owns (RLS enforces ownership). */
export async function deleteListing(formData: FormData) {
  await requireApprovedRealtor();
  const id = str(formData, "id");
  if (!id) redirect(BASE);

  const supabase = await createClient();
  await supabase.from("off_market_listings").delete().eq("id", id);

  revalidatePath(BASE);
  redirect(`${BASE}?deleted=1`);
}
