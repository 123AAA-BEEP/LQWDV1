import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Compass,
  ExternalLink,
  MapPin,
  Phone,
  Rocket,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
 *
 * Visual layer (migration 0065): banner = agent upload, else a hero from
 * their own picks, else the curated placements, else brand gradient.
 * Achievements = system-computed medals from REAL platform data only (never
 * invented ranks), hideable via show_achievements; self-reported awards are
 * listed separately and labelled as agent-provided.
 */

/** Agents verified before this date carry the Founding Agent medal. */
const FOUNDING_AGENT_CUTOFF = "2027-01-01";

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
  banner_url: string | null;
  show_achievements: boolean | null;
  reco_verified_at: string | null;
}

interface AwardRow {
  id: string;
  title: string;
  issuer: string | null;
  year: number | null;
}

interface LinkRow {
  id: string;
  label: string;
  url: string;
}

interface ProspectRow {
  id: string;
  slug: string;
  first_name: string | null;
  last_name: string | null;
  brokerage: string | null;
  city: string | null;
  claimed_by_profile_id: string | null;
}

interface Medal {
  key: string;
  label: string;
  detail: string;
  icon: LucideIcon;
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

/** Pre-minted unclaimed page (outreach wave). RLS hides removed rows. */
async function getProspect(slug: string): Promise<ProspectRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_pages")
    .select("id, slug, first_name, last_name, brokerage, city, claimed_by_profile_id")
    .eq("slug", slug)
    .maybeSingle();
  return (data as ProspectRow) ?? null;
}

function fullName(a: {
  first_name: string | null;
  last_name: string | null;
}): string {
  return [a.first_name, a.last_name].filter(Boolean).join(" ") || "LIQWD Agent";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (agent) {
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
  // Unclaimed prospect pages exist for their owner to find, not for Google —
  // noindex until claimed + verified (young-domain hygiene: no thin name pages).
  const prospect = await getProspect(slug);
  if (!prospect) return { title: "Agent not found" };
  return {
    title: `${fullName(prospect)} — Real Estate Agent${prospect.city ? `, ${prospect.city}` : ""}`,
    robots: { index: false, follow: false },
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
  if (!agent) {
    const prospect = await getProspect(slug);
    if (!prospect) notFound();
    return <UnclaimedProfile prospect={prospect} />;
  }

  const supabase = await createClient();
  const showAchievements = agent.show_achievements !== false;

  // Picks + awards (public read is RLS-gated to public profiles) and the
  // medal source counts, in one wave. Medal counts that live behind RLS
  // (submissions, referrals) come via the admin client — aggregates only,
  // never row data.
  const admin = createAdminClient();
  const [pickRes, awardRes, linkRes, stewardRes, scoutRes, networkRes] =
    await Promise.all([
      supabase
        .from("realtor_page_projects")
        .select("project_id, sort_order")
        .eq("profile_id", agent.profile_id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("realtor_awards")
        .select("id, title, issuer, year")
        .eq("profile_id", agent.profile_id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("realtor_links")
        .select("id, label, url")
        .eq("profile_id", agent.profile_id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      showAchievements
        ? supabase
            .from("public_projects_view")
            .select("project_id", { count: "exact", head: true })
            .eq("assigned_realtor_profile_id", agent.profile_id)
        : Promise.resolve({ count: 0 }),
      showAchievements
        ? admin
            .from("property_submissions")
            .select("id", { count: "exact", head: true })
            .eq("submitted_by_user_id", agent.profile_id)
            .eq("status", "approved")
        : Promise.resolve({ count: 0 }),
      showAchievements
        ? admin
            .from("referrals")
            .select("id", { count: "exact", head: true })
            .eq("referrer_profile_id", agent.profile_id)
            .neq("status", "void")
        : Promise.resolve({ count: 0 }),
    ]);

  const pickIds = ((pickRes.data ?? []) as { project_id: string }[]).map(
    (r) => r.project_id,
  );
  const awards = (awardRes.data ?? []) as AwardRow[];
  // Only http(s) links ever render (validated on write too — belt and braces).
  const links = ((linkRes.data ?? []) as LinkRow[]).filter((l) =>
    /^https?:\/\//i.test(l.url),
  );

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

  // System medals — every one derived from real, current data.
  const medals: Medal[] = [];
  if (showAchievements) {
    if (agent.reco_verified_at && agent.reco_verified_at < FOUNDING_AGENT_CUTOFF) {
      medals.push({
        key: "founding",
        label: "Founding Agent",
        detail: "Verified on LIQWD in its launch year",
        icon: Rocket,
      });
    }
    const steward = stewardRes.count ?? 0;
    if (steward > 0) {
      medals.push({
        key: "steward",
        label: "Project Steward",
        detail: `Official representative on ${steward} live project page${steward === 1 ? "" : "s"}`,
        icon: Building2,
      });
    }
    const scout = scoutRes.count ?? 0;
    if (scout > 0) {
      medals.push({
        key: "scout",
        label: "Project Scout",
        detail: `Added ${scout} project${scout === 1 ? "" : "s"} to the LIQWD catalogue`,
        icon: Compass,
      });
    }
    const network = networkRes.count ?? 0;
    if (network > 0) {
      medals.push({
        key: "network",
        label: "Network Builder",
        detail: `Referred ${network} agent${network === 1 ? "" : "s"} to LIQWD`,
        icon: Users,
      });
    }
  }

  const name = fullName(agent);
  const titleLabel = agent.title
    ? (TITLE_LABELS[agent.title as RealtorTitle] ?? agent.title)
    : null;
  const refSuffix = agent.referral_code
    ? `?ref=${encodeURIComponent(agent.referral_code)}`
    : "";

  // Banner: their upload wins; otherwise borrow a hero from their own picks,
  // then from the curated placements; the brand gradient is the floor.
  const bannerUrl =
    agent.banner_url ??
    picks.find((p) => p.hero_image_url)?.hero_image_url ??
    curated.find((p) => p.hero_image_url)?.hero_image_url ??
    null;

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
      ...(awards.length > 0
        ? {
            award: awards.map((a) =>
              [a.title, a.issuer, a.year].filter(Boolean).join(", "),
            ),
          }
        : {}),
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

      {/* Banner — decorative, so the empty alt is correct */}
      <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-brand-800 via-brand-600 to-brand-400 sm:h-56">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
            unoptimized
            priority
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"
        />
      </div>

      {/* Agent hero — avatar overlaps the banner */}
      <div className="px-4 sm:px-8">
        <div className="relative -mt-12 sm:-mt-16">
          <div className="relative size-28 overflow-hidden rounded-2xl bg-slate-100 shadow-md ring-4 ring-white sm:size-32">
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
        </div>
        <div className="mt-4 min-w-0">
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

          {/* The agent's own links — the link-in-bio surface */}
          {links.length > 0 ? (
            <div className="mt-6 flex w-full max-w-md flex-col gap-2.5">
              {links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="min-w-0 truncate">{l.label}</span>
                  <ExternalLink
                    aria-hidden
                    className="size-4 shrink-0 text-slate-400"
                  />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Awards & achievements — medals are computed, awards are self-reported */}
      {medals.length > 0 || awards.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-ink">
            Awards &amp; achievements
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {medals.map((m) => (
              <div
                key={m.key}
                className="flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 p-3.5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <m.icon aria-hidden className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{m.label}</p>
                  <p className="text-xs text-slate-500">{m.detail}</p>
                </div>
              </div>
            ))}
            {awards.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Trophy aria-hidden className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{a.title}</p>
                  {a.issuer || a.year ? (
                    <p className="text-xs text-slate-500">
                      {[a.issuer, a.year].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {medals.length > 0 || awards.length > 0 ? (
            <p className="mt-2 text-[11px] text-slate-400">
              {medals.length > 0 ? "Medals are earned automatically from LIQWD platform activity." : ""}
              {medals.length > 0 && awards.length > 0 ? " " : ""}
              {awards.length > 0 ? "Other awards are provided by the agent." : ""}
            </p>
          ) : null}
        </section>
      ) : null}

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

/**
 * Pre-minted, unclaimed agent page (outreach wave). Directory-grade info only
 * (name, brokerage, city), no verified badge, noindex — plus real local
 * inventory so the page has substance, and the claim CTA that is the whole
 * point. Flips to the full verified profile automatically once claimed +
 * verified, at this same URL.
 */
async function UnclaimedProfile({ prospect }: { prospect: ProspectRow }) {
  const name = fullName(prospect);
  const first = prospect.first_name ?? name.split(" ")[0];
  const claimed = Boolean(prospect.claimed_by_profile_id);

  // Real published projects near them — substance, not a bare name page.
  let cityProjects: ProjRow[] = [];
  if (prospect.city) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("public_projects_view")
      .select(PROJ_SELECT)
      .ilike("city", `%${prospect.city}%`)
      .or("listing_type.is.null,listing_type.neq.for_rent")
      .order("published_at", { ascending: false })
      .limit(3);
    cityProjects = (data ?? []) as ProjRow[];
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-ink hover:underline">New homes</Link>
        <span aria-hidden className="mx-1.5 text-slate-300">/</span>
        <span aria-current="page" className="font-medium text-slate-700">{name}</span>
      </nav>

      {/* Placeholder banner — the agent's own arrives when they claim */}
      <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-400 sm:h-56" />

      <div className="px-4 sm:px-8">
        <div className="relative -mt-12 sm:-mt-16">
          <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-3xl font-semibold text-slate-400 shadow-md ring-4 ring-white sm:size-32">
            {name.slice(0, 1)}
          </div>
        </div>
        <div className="mt-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {name}
            </h1>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              Unclaimed profile
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            {[prospect.brokerage, prospect.city].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* The claim card — the page's one job */}
        <div className="mt-8 max-w-xl rounded-2xl border border-brand-200 bg-brand-50 p-5">
          {claimed ? (
            <>
              <p className="font-semibold text-brand-800">
                This page has been claimed
              </p>
              <p className="mt-1 text-sm text-brand-700">
                Licence verification is in progress. The full profile appears
                here once it&apos;s confirmed.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-brand-800">Are you {first}?</p>
              <p className="mt-1 text-sm leading-relaxed text-brand-700">
                This page is reserved for you. Claim it free to add your photo,
                banner, awards, your own links, and the projects you sell — and
                buyer inquiries on those projects route directly to you.
              </p>
              <Link
                href={`/realtors/${prospect.slug}/claim`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Claim this page
              </Link>
              <p className="mt-3 text-xs text-brand-700/70">
                Takes about two minutes with your RECO number. Not {name}, or
                want this page removed? Email{" "}
                <a href="mailto:hello@liqwd.ca" className="underline">
                  hello@liqwd.ca
                </a>{" "}
                and it comes down the same day.
              </p>
            </>
          )}
        </div>

        {/* Real local inventory so the page isn't a bare name */}
        {cityProjects.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-ink">
              New construction in {prospect.city}
            </h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cityProjects.map((p) => (
                <Link
                  key={p.project_id}
                  href={`/projects/${p.slug}`}
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
                      <h3 className="line-clamp-2 font-semibold text-ink">
                        {p.project_name}
                      </h3>
                      {p.city ? (
                        <p className="mt-1 text-sm text-slate-500">{p.city}</p>
                      ) : null}
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-14 border-t border-slate-200 pt-6 text-sm text-slate-500">
          This is an unclaimed directory page on LIQWD.{" "}
          <Link href="/agents" className="font-medium text-brand-700 hover:underline">
            Are you an agent? Get your free page →
          </Link>
        </p>
      </div>
    </div>
  );
}
