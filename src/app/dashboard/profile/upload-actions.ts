"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateUpload,
  extFor,
  AVATAR_MAX,
  IMAGE_MIME,
  LOGO_MIME,
} from "@/lib/upload";

const PROFILE = "/dashboard/profile";

/**
 * Uploads an avatar to the PUBLIC `avatars` bucket under {user_id}/ and
 * stores the public URL on the profile. Storage RLS limits writes to the
 * owner's own folder. Replacing re-uses the same path (upsert).
 */
export async function uploadAvatar(formData: FormData) {
  const { file, error } = validateUpload(formData.get("file"), {
    types: IMAGE_MIME,
    max: AVATAR_MAX,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (error) redirect(`${PROFILE}?error=${encodeURIComponent(error)}`);

  const f = file as File;
  const path = `${user.id}/avatar.${extFor(f.type)}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, f, { upsert: true, contentType: f.type });
  if (upErr) {
    redirect(`${PROFILE}?error=${encodeURIComponent("Upload failed. Please try again.")}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  await supabase
    .from("profiles")
    .update({ avatar_url: `${publicUrl}?v=${Date.now()}` })
    .eq("id", user.id);

  redirect(`${PROFILE}?message=avatar-updated`);
}

/**
 * Uploads a logo to the PUBLIC `logos` bucket under {user_id}/ and stores the
 * public URL on the profile.
 */
export async function uploadLogo(formData: FormData) {
  const { file, error } = validateUpload(formData.get("file"), {
    types: LOGO_MIME,
    max: AVATAR_MAX,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (error) redirect(`${PROFILE}?error=${encodeURIComponent(error)}`);

  const f = file as File;
  const path = `${user.id}/logo.${extFor(f.type)}`;
  const { error: upErr } = await supabase.storage
    .from("logos")
    .upload(path, f, { upsert: true, contentType: f.type });
  if (upErr) {
    redirect(`${PROFILE}?error=${encodeURIComponent("Upload failed. Please try again.")}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(path);

  await supabase
    .from("profiles")
    .update({ logo_url: `${publicUrl}?v=${Date.now()}` })
    .eq("id", user.id);

  redirect(`${PROFILE}?message=logo-updated`);
}
