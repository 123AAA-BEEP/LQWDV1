"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PROFILE = "/dashboard/profile";

/*
 * Avatar/logo files are uploaded DIRECTLY from the browser to Supabase
 * Storage (see the profile page's UploadTile) to avoid Vercel's 4.5 MB
 * Server Action body limit. These actions only record the resulting public
 * URL on the profile. Storage RLS restricts writes to the owner's folder.
 */

export async function recordAvatar(formData: FormData) {
  const path = String(formData.get("path") ?? "");
  if (!path) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  await supabase
    .from("profiles")
    .update({ avatar_url: `${publicUrl}?v=${Date.now()}` })
    .eq("id", user.id);

  revalidatePath(PROFILE);
}

export async function recordLogo(formData: FormData) {
  const path = String(formData.get("path") ?? "");
  if (!path) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(path);

  await supabase
    .from("profiles")
    .update({ logo_url: `${publicUrl}?v=${Date.now()}` })
    .eq("id", user.id);

  revalidatePath(PROFILE);
}

/** Page banner — lives in the avatars bucket at {uid}/banner.{ext}. */
export async function recordBanner(formData: FormData) {
  const path = String(formData.get("path") ?? "");
  if (!path) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  await supabase
    .from("profiles")
    .update({ banner_url: `${publicUrl}?v=${Date.now()}` })
    .eq("id", user.id);

  revalidatePath("/dashboard/my-page");
}
