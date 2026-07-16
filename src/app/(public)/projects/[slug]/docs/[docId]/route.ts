import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = () => new NextResponse("Not found", { status: 404 });

/**
 * Public download door for project brochures. The `project-documents` bucket
 * is private by design — instead of moving files, this route checks the
 * public-safe view (doc is `is_public` AND its project is live under this
 * slug), then redirects to a freshly minted short-lived signed URL. Flipping
 * a document back to private (or unpublishing the project) closes the door
 * immediately; previously shared page links just 404.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; docId: string }> },
) {
  const { slug, docId } = await params;
  if (!UUID_RE.test(docId)) return notFound();

  try {
    // Visibility check via the anon-safe definer view (0075): row exists only
    // if the doc is public AND its project is publicly live.
    const supabase = await createClient();
    const { data: doc } = await supabase
      .from("public_project_documents_view")
      .select("id, project_id")
      .eq("id", docId)
      .maybeSingle();
    if (!doc) return notFound();

    const { data: page } = await supabase
      .from("public_projects_view")
      .select("project_id")
      .eq("slug", slug)
      .eq("project_id", doc.project_id)
      .maybeSingle();
    if (!page) return notFound();

    // Only the file path + signed URL need privileged access; the bucket
    // stays private and the link expires in 10 minutes.
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("project_documents")
      .select("file_url")
      .eq("id", docId)
      .eq("is_public", true)
      .maybeSingle();
    if (!row?.file_url) return notFound();

    const { data: signed } = await admin.storage
      .from("project-documents")
      .createSignedUrl(row.file_url, 600);
    if (!signed?.signedUrl) return notFound();

    return NextResponse.redirect(signed.signedUrl, 302);
  } catch {
    // Misconfiguration (e.g. missing service key) degrades to 404, never 500.
    return notFound();
  }
}
