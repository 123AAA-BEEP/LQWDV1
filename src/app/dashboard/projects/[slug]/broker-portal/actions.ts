"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Suggests a broker portal link for a project. Approved realtors (and admins)
 * only. The realtor supplies ONLY the link (and optional access notes); the
 * portal name is preset server-side to "<Project> Broker Portal" so they can't
 * shape it, and the row is inserted pending + inactive — invisible in the broker
 * directory and on the project until an admin approves it. RLS
 * (portals_realtor_suggest) enforces the same constraints at the database level.
 */
export async function suggestBrokerPortal(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const accessNotes = String(formData.get("access_notes") ?? "").trim();

  const back = `/dashboard/projects/${slug}/broker-portal`;

  if (!projectId) {
    redirect(`${back}?error=${encodeURIComponent("Missing project.")}`);
  }
  if (!url) {
    redirect(
      `${back}?error=${encodeURIComponent("Please paste the broker portal link.")}`,
    );
  }
  // Forgiving URL normalization (realtors paste all sorts).
  let normalizedUrl = url;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  try {
    new URL(normalizedUrl);
  } catch {
    redirect(
      `${back}?error=${encodeURIComponent("That doesn't look like a valid link.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Approved-only (defense in depth alongside the page gate + RLS).
  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.verification_status !== "approved") {
    redirect(
      `${back}?error=${encodeURIComponent("Verification is required to suggest a portal.")}`,
    );
  }

  // Canonical name fetched server-side so the preset can't be tampered with.
  const { data: project } = await supabase
    .from("broker_projects_view")
    .select("project_name")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    redirect(`${back}?error=${encodeURIComponent("Project not found.")}`);
  }

  const { error } = await supabase.from("project_broker_portals").insert({
    project_id: projectId,
    portal_name: `${project.project_name} Broker Portal`,
    portal_type: "external_url",
    url: normalizedUrl,
    access_notes: accessNotes || null,
    is_primary: false,
    is_active: false,
    status: "pending",
    added_by_user_id: user.id,
  });

  if (error) {
    redirect(
      `${back}?error=${encodeURIComponent("Could not submit. Please try again.")}`,
    );
  }

  redirect(`/dashboard/projects/${slug}?message=portal-suggested`);
}
