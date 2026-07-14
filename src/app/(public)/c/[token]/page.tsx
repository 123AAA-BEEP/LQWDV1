import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BadgeCheck, FileText, Phone, Sparkles, Wallet } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/public/card-image";
import { formatPriceBand } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * A client collection — "{title}", curated by one agent for one client, shared
 * as a single link. The agent's identity heads the page; every project card
 * carries their ?ref= code, so inquiries route to them no matter how far the
 * link gets forwarded through the client's family. Token-addressed (the token
 * IS the capability — no RLS read; the service-role client resolves it) and
 * noindex: this page is for the Smiths, not for Google.
 *
 * Buyer-portal note: renders ONLY public-safe project data (the public view).
 * The commercials table is never queried here — commission can't leak into a
 * client share even by bug.
 */

export const metadata: Metadata = {
  title: "A shortlist for you",
  robots: { index: false, follow: false },
};

interface AgentIdent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  brokerage_name: string | null;
  referral_code: string | null;
  slug: string | null;
  verified: boolean;
}

interface ProjRow {
  project_id: string;
  slug: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  sales_status: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  price_currency: string | null;
  hero_image_url: string | null;
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(token)) notFound();

  const admin = createAdminClient();
  const { data: coll } = await admin
    .from("client_collections")
    .select("id, profile_id, title, note")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (!coll) notFound();

  // Agent identity — directory-grade fields only. Prefer the public card
  // (adds the verified treatment + page link); fall back to base profile
  // fields for agents who keep their card hidden.
  const [{ data: card }, { data: prof }, { data: itemRows }] = await Promise.all([
    admin
      .from("public_realtor_cards")
      .select("profile_id, first_name, last_name, avatar_url, phone, brokerage, referral_code, slug")
      .eq("profile_id", coll.profile_id)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, phone, brokerage_name, referral_code, verification_status")
      .eq("id", coll.profile_id)
      .maybeSingle(),
    admin
      .from("client_collection_items")
      .select("project_id, sort_order")
      .eq("collection_id", coll.id)
      .order("sort_order", { ascending: true }),
  ]);
  if (!prof) notFound();

  const agent: AgentIdent = card
    ? {
        id: card.profile_id as string,
        first_name: card.first_name as string | null,
        last_name: card.last_name as string | null,
        avatar_url: card.avatar_url as string | null,
        phone: card.phone as string | null,
        brokerage_name: card.brokerage as string | null,
        referral_code: card.referral_code as string | null,
        slug: card.slug as string | null,
        verified: true,
      }
    : {
        id: prof.id as string,
        first_name: prof.first_name as string | null,
        last_name: prof.last_name as string | null,
        avatar_url: prof.avatar_url as string | null,
        phone: prof.phone as string | null,
        brokerage_name: prof.brokerage_name as string | null,
        referral_code: prof.referral_code as string | null,
        slug: null,
        verified: prof.verification_status === "approved",
      };

  const ids = ((itemRows ?? []) as { project_id: string }[]).map((r) => r.project_id);
  let projects: ProjRow[] = [];
  if (ids.length > 0) {
    const { data } = await admin
      .from("public_projects_view")
      .select(
        "project_id, slug, project_name, builder_name, city, sales_status, price_from_public, price_to_public, price_currency, hero_image_url",
      )
      .in("project_id", ids);
    const byId = new Map(((data ?? []) as ProjRow[]).map((p) => [p.project_id, p]));
    projects = ids
      .map((id) => byId.get(id))
      .filter((p): p is ProjRow => Boolean(p));
  }

  // Depth per project — scoped to the projects that actually rendered, so we
  // never fetch or sign materials for a project the public view filtered out:
  //   - the sharing agent's OWN notes (their voice, their shortlists only)
  //   - PROJECT-level shared materials via the shared_project_materials VIEW,
  //     which is the single gate: it contains only rights-confirmed
  //     realtor_share rows whose path sits under a broker folder. Admin /
  //     provenance documents in project_documents can never appear in it.
  // Files live in the PRIVATE project-documents bucket; buyers get 1-hour
  // signed URLs minted here, so nothing gains a permanent public address. The
  // commercials table is never touched.
  const renderedIds = projects.map((p) => p.project_id);
  const notesByProject = new Map<
    string,
    { incentive_note: string | null; deposit_note: string | null; extra_note: string | null }
  >();
  const filesByProject = new Map<string, { label: string; url: string }[]>();
  if (renderedIds.length > 0) {
    const [{ data: noteRows }, { data: fileRows }] = await Promise.all([
      admin
        .from("agent_project_notes")
        .select("project_id, incentive_note, deposit_note, extra_note")
        .eq("profile_id", coll.profile_id)
        .in("project_id", renderedIds),
      admin
        .from("shared_project_materials")
        .select("project_id, title, file_url")
        .in("project_id", renderedIds)
        .order("created_at", { ascending: true }),
    ]);
    for (const n of (noteRows ?? []) as {
      project_id: string;
      incentive_note: string | null;
      deposit_note: string | null;
      extra_note: string | null;
    }[]) {
      notesByProject.set(n.project_id, n);
    }
    const files = (fileRows ?? []) as {
      project_id: string;
      title: string;
      file_url: string;
    }[];
    if (files.length > 0) {
      const { data: signed } = await admin.storage
        .from("project-documents")
        .createSignedUrls(files.map((f) => f.file_url), 3600);
      const urlByPath = new Map(
        (signed ?? [])
          .filter((s) => s.signedUrl && !s.error)
          .map((s) => [s.path as string, s.signedUrl as string]),
      );
      for (const f of files) {
        const u = urlByPath.get(f.file_url);
        if (!u) continue;
        const list = filesByProject.get(f.project_id) ?? [];
        list.push({ label: f.title, url: u });
        filesByProject.set(f.project_id, list);
      }
    }
  }
  const hasAgentMaterials =
    notesByProject.size > 0 || filesByProject.size > 0;

  // Proof-it-works analytics — logged after the response, never blocking.
  after(async () => {
    await admin.from("link_visits").insert({
      profile_id: coll.profile_id,
      collection_id: coll.id,
      source: "collection",
    });
  });

  const name =
    [agent.first_name, agent.last_name].filter(Boolean).join(" ") || "Your agent";
  const first = agent.first_name || name.split(" ")[0];
  const refSuffix = agent.referral_code
    ? `?ref=${encodeURIComponent(agent.referral_code)}`
    : "";

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      {/* Agent header — whose shortlist this is */}
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:size-20">
          {agent.avatar_url ? (
            <Image
              src={agent.avatar_url}
              alt={name}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
              {name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">A shortlist prepared for you by</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-ink">
              {agent.slug ? (
                <Link href={`/realtors/${agent.slug}`} className="hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
            </p>
            {agent.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <BadgeCheck aria-hidden className="size-3.5" /> Verified agent
              </span>
            ) : null}
          </div>
          {agent.brokerage_name ? (
            <p className="text-sm text-slate-500">{agent.brokerage_name}</p>
          ) : null}
        </div>
        {agent.phone ? (
          <a
            href={`tel:${agent.phone.replace(/[^\d+]/g, "")}`}
            className="ml-auto hidden items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:inline-flex"
          >
            <Phone aria-hidden className="size-4" /> Call {first}
          </a>
        ) : null}
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-ink">
        {coll.title}
      </h1>
      {coll.note ? (
        <p className="mt-3 max-w-2xl rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-[15px] leading-relaxed text-slate-700">
          {coll.note}
        </p>
      ) : null}

      {projects.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const band = formatPriceBand(p.price_from_public, p.price_to_public, {
              currency: p.price_currency,
            });
            const notes = notesByProject.get(p.project_id);
            const files = filesByProject.get(p.project_id) ?? [];
            const hasDepth = Boolean(
              notes?.incentive_note || notes?.deposit_note || notes?.extra_note || files.length,
            );
            return (
              <div key={p.project_id} className="h-full">
                <Card className="h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <Link href={`/projects/${p.slug}${refSuffix}`} className="group block">
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      <CardImage
                        src={p.hero_image_url}
                        alt={p.project_name}
                        name={p.project_name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                  </Link>
                  <CardBody>
                    <div className="flex flex-wrap items-center gap-2">
                      {p.sales_status ? (
                        <Badge tone="brand" className="capitalize">
                          {p.sales_status.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                      {p.city ? <Badge tone="neutral">{p.city}</Badge> : null}
                    </div>
                    <Link href={`/projects/${p.slug}${refSuffix}`} className="hover:underline">
                      <h2 className="mt-2 line-clamp-2 font-semibold text-ink">
                        {p.project_name}
                      </h2>
                    </Link>
                    {band ? (
                      <p className="mt-2 text-sm font-medium text-slate-700">{band}</p>
                    ) : null}

                    {/* Depth from the agent — their notes and materials */}
                    {hasDepth ? (
                      <div className="mt-3 space-y-2 rounded-lg border border-brand-100 bg-brand-50/50 p-3">
                        {notes?.incentive_note ? (
                          <p className="flex items-start gap-1.5 text-xs text-slate-700">
                            <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                            <span>
                              <span className="font-semibold">Incentive:</span>{" "}
                              {notes.incentive_note}
                            </span>
                          </p>
                        ) : null}
                        {notes?.deposit_note ? (
                          <p className="flex items-start gap-1.5 text-xs text-slate-700">
                            <Wallet aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                            <span>
                              <span className="font-semibold">Deposit:</span>{" "}
                              {notes.deposit_note}
                            </span>
                          </p>
                        ) : null}
                        {notes?.extra_note ? (
                          <p className="text-xs italic leading-relaxed text-slate-600">
                            “{notes.extra_note}” — {first}
                          </p>
                        ) : null}
                        {files.map((f) => (
                          <a
                            key={f.url}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700"
                          >
                            <FileText aria-hidden className="size-3.5 shrink-0 text-slate-400" />
                            {f.label}
                          </a>
                        ))}
                      </div>
                    ) : null}

                    <p className="mt-2 text-xs text-slate-500">
                      Inquiries go to {first}.
                    </p>
                  </CardBody>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-8 text-sm text-slate-500">
          {first} hasn&apos;t added projects to this shortlist yet — check back
          soon.
        </p>
      )}

      {agent.phone ? (
        <p className="mt-10 sm:hidden">
          <a
            href={`tel:${agent.phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Phone aria-hidden className="size-4" /> Call {first}
          </a>
        </p>
      ) : null}

      <p className="mt-14 border-t border-slate-200 pt-6 text-sm text-slate-500">
        Powered by{" "}
        <Link href="/projects" className="font-medium text-brand-700 hover:underline">
          LIQWD
        </Link>{" "}
        — new construction &amp; pre-construction homes.
        {agent.slug ? (
          <>
            {" "}
            See more from{" "}
            <Link
              href={`/realtors/${agent.slug}`}
              className="font-medium text-brand-700 hover:underline"
            >
              {name} →
            </Link>
          </>
        ) : null}
      </p>

      {hasAgentMaterials ? (
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          Floor plans, incentive and deposit details, and other materials on
          this page are provided by licensed real estate agents, not by LIQWD
          or the builder. Builders generally make such materials available for
          agents to share with their clients, but LIQWD does not verify any
          agent&apos;s rights to distribute them and accepts no responsibility
          for their accuracy, currency, or use. Pricing, incentives, and
          availability change without notice — confirm details with {first}{" "}
          before relying on them.
        </p>
      ) : null}
    </div>
  );
}
