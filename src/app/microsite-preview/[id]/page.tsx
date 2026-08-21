import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import {
  getMicrositeProject,
  getMicrositeGallery,
  getMicrositeStock,
  type MicrositeConfig,
} from "@/lib/microsites";
import { MicrositeSiteView } from "@/app/sites/[domain]/site-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Microsite preview",
  robots: { index: false, follow: false },
};

/**
 * Admin-only, pixel-true preview: renders the EXACT component the public
 * domain serves, at any status — what you see here is what goes live.
 * Lead submissions from a draft preview are rejected server-side (the
 * capture action requires status=live), hence the banner.
 */
export default async function MicrositePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertAdmin(await createClient());
  const { id } = await params;

  const admin = createAdminClient();
  // Keep this select in lockstep with getMicrositeByDomain — a missing
  // column here makes the preview lie (pins/logo absent from preview but
  // present on the live domain).
  const { data } = await admin
    .from("microsite_configs")
    .select(
      "id, domain, project_id, skin, status, context, content, capture_key, auto_send_details, details_url, builder_logo_url, google_verification, image_slots",
    )
    .eq("id", id)
    .maybeSingle();
  const config = (data as MicrositeConfig | null) ?? null;
  if (!config) notFound();

  const project = await getMicrositeProject(config.project_id);
  if (!config.content || !project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="max-w-md text-center">
          <p className="text-2xl font-semibold text-ink">Nothing to preview yet</p>
          <p className="mt-2 text-sm text-slate-500">
            {!project
              ? "The project isn't publicly visible. Publish it first."
              : "Generate content, then come back."}
          </p>
          <Link
            href={`/dashboard/admin/microsites/${config.id}`}
            className="mt-4 inline-block text-sm text-brand-700 underline"
          >
            Back to the microsite admin
          </Link>
        </div>
      </main>
    );
  }

  const [gallery, stock] = await Promise.all([
    getMicrositeGallery(project.project_id),
    getMicrositeStock(),
  ]);
  return (
    <MicrositeSiteView
      config={config}
      project={project}
      gallery={gallery}
      stock={stock}
      previewNote={`Preview of ${config.domain} (${config.status}) · exactly what visitors get${config.status !== "live" ? " · lead form inactive until live" : ""}`}
    />
  );
}
