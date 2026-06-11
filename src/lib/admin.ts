import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Asserts the current session belongs to an admin. Returns the admin user id.
 * RLS already blocks non-admin writes; this gives clean redirects and
 * defense-in-depth for admin Server Actions.
 */
export async function assertAdmin(
  supabase: SupabaseClient,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (data?.role !== "admin") {
    redirect("/dashboard");
  }
  return user.id;
}
