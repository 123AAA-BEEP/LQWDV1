import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Tracked broker-portal open. Records a click (attributed to the signed-in user
 * via RLS), resolves the destination — an external URL, or a short-lived signed
 * URL for a file-type portal — then redirects. This is what makes featured
 * placement a measurable ad product.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fallback = new URL("/dashboard/broker-portals", req.url);

  const { data: portal } = await supabase
    .from("project_broker_portals")
    .select("id, project_id, url, file_url, is_featured, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!portal || portal.is_active === false) {
    return NextResponse.redirect(fallback);
  }

  // Resolve destination: external URL wins; otherwise sign the stored file path.
  let dest: string | null = (portal.url as string | null) ?? null;
  const fileUrl = portal.file_url as string | null;
  if (!dest && fileUrl) {
    if (/^https?:\/\//i.test(fileUrl)) {
      dest = fileUrl;
    } else {
      const { data: signed } = await supabase.storage
        .from("project-documents")
        .createSignedUrl(fileUrl, 3600);
      dest = signed?.signedUrl ?? null;
    }
  }
  if (!dest) return NextResponse.redirect(fallback);

  // Best-effort click log (RLS attributes it to the signed-in user).
  if (user) {
    await supabase.from("broker_portal_events").insert({
      portal_id: portal.id,
      project_id: portal.project_id,
      actor_profile_id: user.id,
      event_type: "click",
      was_featured: (portal.is_featured as boolean | null) ?? false,
    });
  }

  return NextResponse.redirect(dest);
}
