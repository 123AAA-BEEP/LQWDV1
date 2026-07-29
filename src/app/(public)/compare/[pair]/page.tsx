import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardImage } from "@/components/public/card-image";
import { ButtonLink } from "@/components/ui/button";
import { formatPriceBand, primaryBuilderName } from "@/lib/types";
import type { PublicProject } from "@/lib/types";
import { plainSlug } from "@/lib/slug";
import { pairPath } from "@/lib/compare";

export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

/**
 * Programmatic "[A] vs [B]" comparison pages — /compare/a-slug-vs-b-slug.
 * Serves the cross-shopping query almost nobody targets. Pages exist only
 * for QUALIFYING pairs: both published, same city, same project type — the
 * combos buyers genuinely weigh against each other. Everything rendered is
 * live listing data (always true, unique per pair); the canonical URL is
 * the alphabetical slug ordering, and the reversed URL 308s to it so the
 * pair never splits its ranking signals.
 */

function parsePair(pair: string): [string, string] | null {
  const idx = pair.indexOf("-vs-");
  if (idx <= 0) return null;
  const a = pair.slice(0, idx);
  const b = pair.slice(idx + 4);
  if (!a || !b || a === b) return null;
  return [a, b];
}

async function getPair(
  slugs: [string, string],
): Promise<[PublicProject, PublicProject] | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("*")
    .in("slug", slugs);
  const rows = (data as PublicProject[] | null) ?? [];
  const a = rows.find((r) => r.slug === slugs[0]);
  const b = rows.find((r) => r.slug === slugs[1]);
  if (!a || !b) return null;
  // Qualifying pairs only — same market, same product. Anything else is a
  // crafted URL, not a real cross-shop.
  if (!a.city || a.city !== b.city) return null;
  if (!a.project_type || a.project_type !== b.project_type) return null;
  return [a, b];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await params;
  const slugs = parsePair(pair);
  if (!slugs) return { title: "Compare projects" };
  const found = await getPair(slugs);
  if (!found) return { title: "Compare projects" };
  const [a, b] = found;
  return {
    title: `${a.project_name} vs ${b.project_name}: ${a.city} Pre-Construction Compared`,
    description: `Side-by-side comparison of ${a.project_name} and ${b.project_name} in ${a.city}: pricing, suite mix, sizes, occupancy timelines, and builders — live data from LIQWD's tracked listings.`,
    alternates: { canonical: pairPath(a.slug, b.slug) },
  };
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-t border-slate-100 px-4 py-3 text-sm text-slate-700">
      {children ?? <span className="text-slate-300">—</span>}
    </td>
  );
}

function Head({ p }: { p: PublicProject }) {
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
        <CardImage
          src={p.hero_image_url}
          alt={p.project_name}
          name={p.project_name}
          className="h-full w-full object-cover"
        />
      </div>
      <h2 className="mt-3 text-lg font-semibold text-ink">{p.project_name}</h2>
      <ButtonLink
        href={`/projects/${p.slug}`}
        variant="secondary"
        className="mt-2"
      >
        Full listing & price list
      </ButtonLink>
    </div>
  );
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  const slugs = parsePair(pair);
  if (!slugs) notFound();

  // Canonical ordering: alphabetical. The reversed URL redirects.
  const sorted = [...slugs].sort() as [string, string];
  if (slugs[0] !== sorted[0]) {
    permanentRedirect(pairPath(sorted[0], sorted[1]));
  }

  const found = await getPair(sorted);
  if (!found) notFound();
  const [a, b] = found;

  const rows: { label: string; get: (p: PublicProject) => React.ReactNode }[] = [
    { label: "Builder", get: (p) => primaryBuilderName(p.builder_name) },
    {
      label: "Location",
      get: (p) => [p.neighbourhood, p.city].filter(Boolean).join(", "),
    },
    {
      label: "Status",
      get: (p) => (p.sales_status ? p.sales_status.replace(/_/g, " ") : null),
    },
    {
      label: "Pricing",
      get: (p) =>
        formatPriceBand(p.price_from_public, p.price_to_public, {
          currency: p.price_currency,
        }) ?? "On request",
    },
    { label: "Bedrooms", get: (p) => p.bedrooms_summary },
    {
      label: "Sizes",
      get: (p) =>
        p.size_range_sqft_min || p.size_range_sqft_max
          ? `${p.size_range_sqft_min?.toLocaleString() ?? "?"}–${p.size_range_sqft_max?.toLocaleString() ?? "?"} sq ft`
          : null,
    },
    { label: "Storeys", get: (p) => p.storeys },
    { label: "Total units", get: (p) => p.total_units },
    { label: "Occupancy", get: (p) => p.occupancy_estimate_text },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${a.project_name} vs ${b.project_name}`,
    itemListElement: [a, b].map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.project_name,
      url: `${SITE_URL}/projects/${p.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-slate-400">
        <Link href="/projects" className="hover:text-slate-600">
          Browse
        </Link>{" "}
        / <span>Compare</span>
      </nav>
      <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {a.project_name} vs {b.project_name}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        Two {a.city} new-construction developments buyers cross-shop, side by
        side — live listing data, no winner-crowning. The right one depends on
        your budget, timeline, and suite needs.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <Head p={a} />
        <Head p={b} />
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400" />
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink">
                {a.project_name}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink">
                {b.project_name}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="border-t border-slate-100 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {r.label}
                </td>
                <Cell>{r.get(a)}</Cell>
                <Cell>{r.get(b)}</Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        Data comes from each project&apos;s live LIQWD listing and changes as
        builders release pricing and plans — open the full listings above for
        floor plans, brochures, and to request current price lists. LIQWD
        doesn&apos;t rank or recommend one project over another.
      </p>

      <p className="mt-4 text-sm text-slate-500">
        More in {a.city}:{" "}
        <Link
          href={`/new-homes/${plainSlug(a.city ?? "")}`}
          className="text-brand-700 hover:underline"
        >
          all new homes in {a.city} →
        </Link>
      </p>
    </div>
  );
}
