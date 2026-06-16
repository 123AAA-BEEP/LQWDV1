"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { createNotifications } from "@/lib/notifications";

/**
 * Admin moderation override for an opportunity. Suspending pulls it from the
 * realtor marketplace immediately and notifies the developer.
 */
export async function setOpportunityAdminStatus(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const id = String(formData.get("opportunity_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();
  if (!id || !["suspended", "open", "closed"].includes(status)) return;

  const { data: opp } = await supabase
    .from("opportunities")
    .select("developer_id, title")
    .eq("id", id)
    .maybeSingle();

  await supabase
    .from("opportunities")
    .update({ status, admin_notes: notes || null })
    .eq("id", id);

  if (status === "suspended" && opp?.developer_id) {
    await createNotifications([
      {
        user_id: opp.developer_id as string,
        type: "admin_message",
        title: "An admin suspended your opportunity",
        body: notes || opp.title,
        link_url: `/dashboard/developer/${id}`,
        opportunity_id: id,
      },
    ]);
  }

  revalidatePath("/dashboard/admin/opportunities");
  redirect("/dashboard/admin/opportunities?message=updated");
}

/** Grants (or revokes) developer-console access by email. */
export async function setDeveloperAccess(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "developer");
  if (!email || !["developer", "realtor"].includes(role)) {
    redirect(
      "/dashboard/admin/opportunities?error=" +
        encodeURIComponent("Enter a valid email."),
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    redirect(
      "/dashboard/admin/opportunities?error=" +
        encodeURIComponent("No account found for that email."),
    );
  }
  if (profile.role === "admin") {
    redirect(
      "/dashboard/admin/opportunities?error=" +
        encodeURIComponent("That account is an admin; role unchanged."),
    );
  }

  await supabase.from("profiles").update({ role }).eq("id", profile.id);

  if (role === "developer") {
    await createNotifications([
      {
        user_id: profile.id as string,
        type: "admin_message",
        title: "Developer console enabled",
        body: "You can now list opportunities in the developer console.",
        link_url: "/dashboard/developer",
      },
    ]);
  }

  revalidatePath("/dashboard/admin/opportunities");
  redirect("/dashboard/admin/opportunities?message=role");
}
