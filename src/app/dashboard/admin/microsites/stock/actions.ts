"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { redirectWithFlash } from "@/lib/flash";
import { pathFromPublicUrl } from "@/lib/upload";
import { STOCK_THEMES } from "@/lib/microsites";

const PAGE = "/dashboard/admin/microsites/stock";

/**
 * Records a stock image after the browser uploaded it straight to the
 * stock-images bucket (same direct-upload pattern as project media — storage
 * RLS independently enforces admin-only writes).
 */
export async function recordStockImage(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const path = String(formData.get("path") ?? "");
  const theme = String(formData.get("theme") ?? "");
  if (!path || !(STOCK_THEMES as readonly string[]).includes(theme)) return;

  const {
    data: { publicUrl },
  } = supabase.storage.from("stock-images").getPublicUrl(path);

  await supabase.from("microsite_stock_images").insert({
    theme,
    url: publicUrl,
    alt_text: String(formData.get("alt_text") ?? "").trim().slice(0, 200) || null,
    city: String(formData.get("city") ?? "").trim().slice(0, 80) || null,
  });
  revalidatePath(PAGE);
}

/** Adds a stock image by URL (e.g. an Unsplash/Pexels CDN link). */
export async function addStockByUrl(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const url = String(formData.get("url") ?? "").trim().slice(0, 2000);
  const theme = String(formData.get("theme") ?? "");
  if (!/^https:\/\/.+/.test(url)) {
    redirectWithFlash(PAGE, "Paste a full https image URL.", "error");
  }
  if (!(STOCK_THEMES as readonly string[]).includes(theme)) {
    redirectWithFlash(PAGE, "Pick a theme.", "error");
  }
  await supabase.from("microsite_stock_images").insert({
    theme,
    url,
    alt_text: String(formData.get("alt_text") ?? "").trim().slice(0, 200) || null,
    city: String(formData.get("city") ?? "").trim().slice(0, 80) || null,
  });
  revalidatePath(PAGE);
  redirectWithFlash(PAGE, "Added to the library.");
}

export async function deleteStockImage(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const id = String(formData.get("stock_id") ?? "");
  if (!id) return;

  const { data: row } = await supabase
    .from("microsite_stock_images")
    .select("url")
    .eq("id", id)
    .maybeSingle();
  if (row?.url) {
    const path = pathFromPublicUrl(row.url, "stock-images");
    if (path) await supabase.storage.from("stock-images").remove([path]);
  }
  await supabase.from("microsite_stock_images").delete().eq("id", id);
  revalidatePath(PAGE);
}
