import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BadgeCheck, Phone } from "lucide-react";
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
            return (
              <Link
                key={p.project_id}
                href={`/projects/${p.slug}${refSuffix}`}
                className="group block h-full"
              >
                <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <CardImage
                      src={p.hero_image_url}
                      alt={p.project_name}
                      name={p.project_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <CardBody>
                    <div className="flex flex-wrap items-center gap-2">
                      {p.sales_status ? (
                        <Badge tone="brand" className="capitalize">
                          {p.sales_status.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                      {p.city ? <Badge tone="neutral">{p.city}</Badge> : null}
                    </div>
                    <h2 className="mt-2 line-clamp-2 font-semibold text-ink">
                      {p.project_name}
                    </h2>
                    {band ? (
                      <p className="mt-2 text-sm font-medium text-slate-700">{band}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      Inquiries go to {first}.
                    </p>
                  </CardBody>
                </Card>
              </Link>
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
    </div>
  );
}
