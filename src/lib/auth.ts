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
    // Populate from the metadata captured at signup (auth.signUp options.data).
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const str = (k: string) =>
      typeof meta[k] === "string" && meta[k] ? (meta[k] as string) : null;
    const title = str("title");
    const validTitle =
      title && ["sales_representative", "broker", "broker_of_record"].includes(title)
        ? title
        : null;

    const { data: inserted } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? null,
        role: "realtor",
        verification_status: "pending",
        first_name: str("first_name"),
        last_name: str("last_name"),
        phone: str("phone"),
        brokerage_name: str("brokerage_name"),
        reco_registration_number: str("reco_registration_number"),
        title: validTitle,
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

export function isDeveloper(profile: Pick<Profile, "role">) {
  return profile.role === "developer";
}
