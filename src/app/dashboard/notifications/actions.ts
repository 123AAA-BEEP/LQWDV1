"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

/** Marks one notification read, then follows its link if present. */
export async function markRead(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const id = String(formData.get("notification_id") ?? "");
  const to = String(formData.get("link_url") ?? "");
  if (id) {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
  }
  revalidatePath("/dashboard/notifications");
  redirect(to || "/dashboard/notifications");
}

/** Marks every unread notification read. */
export async function markAllRead() {
  const { supabase, userId } = await currentUser();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications");
}
