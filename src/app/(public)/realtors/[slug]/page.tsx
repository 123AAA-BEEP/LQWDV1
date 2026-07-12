import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/public/card-image";
import { formatPriceBand, TITLE_LABELS, type RealtorTitle } from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

/**
 * Public agent profile — /realtors/{slug}. The Zocdoc-style entity page that
 * ranks for "{name} realtor {city}" and doubles as the agent's link-in-bio.
 *
 * Freemium rendering rule (the monetizable mechanic):
 *  - The agent's SELF-PICKED projects link with their ?ref= code, so leads
 *    from their own page route to them (free value, real and immediate).
 *  - FREE-tier pages ALSO carry LIQWD-curated featured placements for the
 *    agent's market (developer-paid surface). PRO pages render only the
 *    agent's own picks — full control is the upgrade.
 * Only opted-in (is_public_profile_enabled) + RECO-verified agents exist in
 * the view, so every page here is consented and licensed.
 */

interface AgentCard {
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  brokerage: string | null;
  email: string | null;
  phone: string | null;
  slug: string | null;
  avatar_url: string | null;
  bio_short: string | null;
  service_area: string | null;
  referral_code: string | null;
  is_pro: boolean | null;
}

interface ProjRow {
  project_id: string;
  slug: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  project_type: string | null;
  sales_status: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  price_currency: string | null;
  hero_image_url: string | null;
  is_featured: boolean | null;
  is_advertiser: boolean | null;
  listing_type: string | null;
}

const PROJ_SELECT =
  "project_id, slug, project_name, builder_name, city, project_type, sales_status, price_from_public, price_to_public, price_currency, hero_image_url, is_featured, is_advertiser, listing_type";

async function getAgent(slug: string): Promise<AgentCard | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_realtor_cards")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as AgentCard) ?? null;
}

function fullName(a: AgentCard): string {
  return [a.first_name, a.last_name].filter(Boolean).join(" ") || "LIQWD Agent";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) return { title: "Agent not found" };
  const name = fullName(agent);
  const area = agent.service_area || "Ontario";
  return {
    title: `${name} — ${agent.brokerage ?? "Real Estate Agent"} | New Construction, ${area}`,
    description:
      agent.bio_short ||
      `${name} is a verified real estate agent${agent.brokerage ? ` with ${agent.brokerage}` : ""} specializing in new & pre-construction homes in ${area}. Browse their projects and get in touch.`,
    alternates: { canonical: `/realtors/${slug}` },
  };
}

export default async function RealtorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  const supabase = await createClient();

  // The agent's own picks (public read is RLS-gated to public profiles).
  const { data: pickRows } = await supabase
    .from("realtor_page_projects")
    .select("project_id, sort_order")
    .eq("profile_id", agent.profile_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const pickIds = ((pickRows ?? []) as { project_id: string }[]).map((r) => r.project_id);

  let picks: ProjRow[] = [];
  if (pickIds.length > 0) {
    const { data } = await supabase
      .from("public_projects_view")
      .select(PROJ_SELECT)
      .in("project_id", pickIds);
    const byId = new Map(((data ?? []) as ProjRow[]).map((p) => [p.project_id, p]));
    picks = pickIds.map((id) => byId.get(id)).filter((p): p is ProjRow => Boolean(p));
  }

  // Curated featured placements for the agent's market — FREE pages only.
  // Geo match: the project's city appears in the agent's service_area text;
  // falls back to top featured Ontario placements when nothing matches.
  let curated: ProjRow[] = [];
  if (!agent.is_pro) {
    const { data } = await supabase
      .from("public_projects_view")
      .select(PROJ_SELECT)
      .or("is_advertiser.eq.true,is_featured.eq.true")
      .or("listing_type.is.null,listing_type.neq.for_rent")
      .order("featured_rank", { ascending: true, nullsFirst: false })
      .order("published_at", { ascending: false })
      .limit(16);
    const pool = ((data ?? []) as ProjRow[]).filter((p) => !pickIds.includes(p.project_id));
    const area = (agent.service_area ?? "").toLowerCase();
    const geoMatched = area
      ? pool.filter((p) => p.city && area.includes(p.city.toLowerCase()))
      : [];
    curated = [...geoMatched, ...pool.filter((p) => !geoMatched.includes(p))].slice(0, 3);
  }

  const name = fullName(agent);
  const titleLabel = agent.title
    ? (TITLE_LABELS[agent.title as RealtorTitle] ?? agent.title)
    : null;
  const refSuffix = agent.referral_code
    ? `?ref=${encodeURIComponent(agent.referral_code)}`
    : "";

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name,
      url: `${SITE_URL}/realtors/${slug}`,
      ...(agent.avatar_url ? { image: agent.avatar_url } : {}),
      ...(agent.brokerage
        ? { worksFor: { "@type": "Organization", name: agent.brokerage } }
        : {}),
      ...(agent.service_area ? { areaServed: agent.service_area } : {}),
      ...(agent.phone ? { telephone: agent.phone } : {}),
      knowsAbout: "New construction and pre-construction homes",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "New homes", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: name, item: `${SITE_URL}/realtors/${slug}` },
      ],
    },
  ];

  const ProjectCard = ({ p, withRef }: { p: ProjRow; withRef: boolean }) => {
    const band = formatPriceBand(p.price_from_public, p.price_to_public, {
      currency: p.price_currency,
    });
    return (
      <Link
        href={`/projects/${p.slug}${withRef ? refSuffix : ""}`}
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
            <h3 className="mt-2 line-clamp-2 font-semibold text-ink">{p.project_name}</h3>
            {band ? (
              <p className="mt-2 text-sm font-medium text-slate-700">{band}</p>
            ) : null}
          </CardBody>
        </Card>
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      {schema.map((b, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }}
        />
      ))}

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-ink hover:underline">New homes</Link>
        <span aria-hidden className="mx-1.5 text-slate-300">/</span>
        <span aria-current="page" className="font-medium text-slate-700">{name}</span>
      </nav>

      {/* Agent hero */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:size-32">
          {agent.avatar_url ? (
            <Image
              src={agent.avatar_url}
              alt={name}
              fill
              sizes="128px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-slate-400">
              {name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {name}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <BadgeCheck aria-hidden className="size-3.5" /> Verified agent
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            {[titleLabel, agent.brokerage].filter(Boolean).join(" · ")}
          </p>
          {agent.service_area ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin aria-hidden className="size-4" /> Serving {agent.service_area}
            </p>
          ) : null}
          {agent.bio_short ? (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              {agent.bio_short}
            </p>
          ) : null}
          {agent.phone ? (
            <p className="mt-4">
              <a
                href={`tel:${agent.phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Phone aria-hidden className="size-4" /> Call {name.split(" ")[0]}
              </a>
            </p>
          ) : null}
        </div>
      </div>

      {/* The agent's projects — their picks route leads to them via ?ref= */}
      {picks.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-ink">
            {name.split(" ")[0]}&apos;s projects
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Inquiries on these pages go directly to {name.split(" ")[0]}.
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((p) => (
              <ProjectCard key={p.project_id} p={p} withRef />
            ))}
          </div>
        </section>
      ) : null}

      {/* Curated placements — free-tier pages only (developer-paid surface) */}
      {curated.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-ink">
            Featured{agent.service_area ? ` in ${agent.service_area}` : " projects"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Curated by LIQWD.</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {curated.map((p) => (
              <ProjectCard key={p.project_id} p={p} withRef={false} />
            ))}
          </div>
        </section>
      ) : null}

      {picks.length === 0 && curated.length === 0 ? (
        <p className="mt-12 text-sm text-slate-500">
          {name.split(" ")[0]} hasn&apos;t added projects to their page yet.
        </p>
      ) : null}

      <p className="mt-14 border-t border-slate-200 pt-6 text-sm text-slate-500">
        {name} is a RECO-verified real estate agent on LIQWD.{" "}
        <Link href="/agents" className="font-medium text-brand-700 hover:underline">
          Are you an agent? Get your free page →
        </Link>
      </p>
    </div>
  );
}
