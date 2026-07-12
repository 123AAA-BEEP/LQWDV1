import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Globe, Plus, Sparkles, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUserProfile } from "@/lib/auth";
import { hasActivePro } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { addPagePick, removePagePick, ensureSlug } from "./actions";

export const metadata: Metadata = { title: "My public page" };
export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

// Kept in sync with actions.ts.
const FREE_PICK_LIMIT = 3;

interface PickRow {
  id: string;
  project_id: string;
  projects: { project_name: string; city: string | null } | null;
}

export default async function MyPagePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; message?: string; error?: string }>;
}) {
  const { profile } = await requireUserProfile();
  const { q, message, error } = await searchParams;

  if (profile.role !== "realtor") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">My public page</h1>
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            Public agent pages are for realtor accounts.
          </CardBody>
        </Card>
      </div>
    );
  }

  const verified = profile.verification_status === "approved";
  if (verified) await ensureSlug();

  const supabase = await createClient();
  const { data: fresh } = await supabase
    .from("profiles")
    .select("slug, is_public_profile_enabled, plan, realtor_tier, pro_until")
    .eq("id", profile.id)
    .maybeSingle();
  const slug = (fresh as { slug?: string | null } | null)?.slug ?? null;
  const isPublic = Boolean(fresh?.is_public_profile_enabled);
  const pro =
    fresh?.plan === "pro" ||
    fresh?.plan === "ultra" ||
    fresh?.realtor_tier === "pro" ||
    fresh?.realtor_tier === "ultra" ||
    hasActivePro({ pro_until: (fresh?.pro_until as string | null) ?? null });

  const { data: pickData } = await supabase
    .from("realtor_page_projects")
    .select("id, project_id, projects(project_name, city)")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });
  const picks = (pickData ?? []) as unknown as PickRow[];

  // Project search for the picker (published only, excluding current picks).
  const query = (q ?? "").trim();
  let results: { project_id: string; project_name: string; city: string | null }[] = [];
  if (query) {
    const { data } = await supabase
      .from("public_projects_view")
      .select("project_id, project_name, city")
      .or(`project_name.ilike.%${query}%,city.ilike.%${query}%`)
      .limit(8);
    const pickedIds = new Set(picks.map((p) => p.project_id));
    results = ((data ?? []) as typeof results).filter((r) => !pickedIds.has(r.project_id));
  }

  const pageUrl = slug ? `${SITE_URL}/realtors/${slug}` : null;
  const atCap = !pro && picks.length >= FREE_PICK_LIMIT;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">My public page</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your free agent profile on LIQWD — use it as your link-in-bio. Inquiries
          on projects you add route directly to you.
        </p>
      </div>

      {message ? <Notice tone="success">{message === "added" ? "Project added to your page." : "Removed."}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {!verified ? (
        <Notice tone="warning">
          Your page goes live once you&apos;re verified.{" "}
          <Link href="/dashboard/verify" className="font-medium underline">
            Complete verification →
          </Link>
        </Notice>
      ) : !isPublic ? (
        <Notice tone="warning">
          Your page is hidden — enable &quot;Show my realtor card&quot; in{" "}
          <Link href="/dashboard/profile" className="font-medium underline">
            Profile &amp; settings
          </Link>{" "}
          to publish it.
        </Notice>
      ) : null}

      {pageUrl ? (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Globe aria-hidden className="size-5 shrink-0 text-brand-600" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Your page
                  </p>
                  <p className="truncate font-medium text-ink">{pageUrl.replace(/^https?:\/\//, "")}</p>
                </div>
              </div>
              <ButtonLink href={`/realtors/${slug}`} variant="secondary" target="_blank">
                <ExternalLink aria-hidden className="mr-1.5 size-4" /> View
              </ButtonLink>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Paste this link in your Instagram / Facebook bio. Add a photo and bio in{" "}
              <Link href="/dashboard/profile" className="font-medium text-brand-700 hover:underline">
                Profile &amp; settings
              </Link>{" "}
              — pages with a photo convert better.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {/* Current picks */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Projects on your page</h2>
            <span className="text-xs text-slate-500">
              {pro ? `${picks.length} added` : `${picks.length}/${FREE_PICK_LIMIT} (free plan)`}
            </span>
          </div>

          {picks.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No projects yet — search below and add the developments you work.
              Inquiries on them route to you, free, no referral fees.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {picks.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-sm text-slate-700">
                    {p.projects?.project_name ?? "Project"}
                    {p.projects?.city ? (
                      <span className="text-slate-400"> · {p.projects.city}</span>
                    ) : null}
                  </span>
                  <form action={removePagePick}>
                    <input type="hidden" name="pick_id" value={p.id} />
                    <button
                      type="submit"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {/* Search + add */}
          <form method="get" className="mt-4 flex gap-2">
            <Input name="q" placeholder="Search projects by name or city…" defaultValue={query} />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          {query && results.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No published projects match “{query}”.</p>
          ) : null}
          {results.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {results.map((r) => (
                <li key={r.project_id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-sm text-slate-700">
                    {r.project_name}
                    {r.city ? <span className="text-slate-400"> · {r.city}</span> : null}
                  </span>
                  <form action={addPagePick}>
                    <input type="hidden" name="project_id" value={r.project_id} />
                    <Button type="submit" variant="secondary" disabled={atCap}>
                      <Plus aria-hidden className="mr-1 size-4" /> Add
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
        </CardBody>
      </Card>

      {/* Tier explainer / upsell */}
      {!pro ? (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div>
                <h2 className="font-semibold text-ink">Free vs. Pro pages</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Free pages show your {FREE_PICK_LIMIT} chosen projects plus
                  LIQWD-curated featured developments for your market. Pro pages
                  are fully yours: unlimited projects, no curated placements.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
