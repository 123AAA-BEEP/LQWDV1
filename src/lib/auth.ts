import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Returns the current user + their profile, bootstrapping a profile row on
 * first access. The profile insert is permitted by RLS (id = auth.uid()).
 * Redirects to /login when there is no session.
 */
export async function requireUserProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const { data: inserted } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? null,
        role: "realtor",
        verification_status: "pending",
      })
      .select("*")
      .single();
    profile = inserted;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
  };
}

export function isApproved(profile: Pick<Profile, "verification_status">) {
  return profile.verification_status === "approved";
}

export function isAdmin(profile: Pick<Profile, "role">) {
  return profile.role === "admin";
}
