import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Stat } from "@/components/public/hub-sections";
import { plainSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

/**
 * GTA Pre-Construction Report — a live, data-dense market snapshot built from
 * our own inventory. This is the linkable asset: unique aggregate numbers
 * (total active developments, distribution by city / type / price / completion
 * year) that journalists, newsletters, and agents can cite, with Dataset
 * schema so it's eligible for Google Dataset Search. Every figure is computed
 * live and honestly labelled "as of {date}" — no invented velocity.
 */

export const metadata: Metadata = {
  title: "GTA Pre-Construction Report — Live Market Data",
  description:
    "A live snapshot of Greater Toronto Area new-construction and pre-construction inventory: active developments by city, home type, price band, and completion year.",
  alternates: { canonical: "/reports/gta-pre-construction" },
};

const ONTARIO_GTA = [
  "Toronto", "Old Toronto", "North York", "Scarborough", "Etobicoke",
  "Mississauga", "Brampton", "Vaughan", "Markham", "Richmond Hill",
  "Oakville", "Burlington", "Milton", "Caledon", "Whitby", "Oshawa",
  "Pickering", "Ajax", "Newmarket", "Aurora", "King", "Whitchurch-Stouffville",
  "East Gwillimbury", "Clarington", "Halton Hills", "Georgina",
];

interface Row {
  city: string | null;
  province: string | null;
  project_type: string | null;
  sales_status: string | null;
  price_from_public: number | null;
  occupancy_estimate_text: string | null;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function GtaReportPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("city, province, project_type, sales_status, price_from_public, occupancy_estimate_text, listing_type")
    .or("listing_type.is.null,listing_type.neq.for_rent")
    .limit(5000);

  const all = ((data ?? []) as (Row & { listing_type: string | null })[]).filter(
    (r) => r.city && ONTARIO_GTA.some((c) => c.toLowerCase() === (r.city ?? "").toLowerCase()),
  );
  const total = all.length;

  // By city
  const cityCounts = new Map<string, number>();
  for (const r of all) cityCounts.set(r.city!, (cityCounts.get(r.city!) ?? 0) + 1);
  const byCity = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]);

  // By type
  const typeOf = (k: string) => all.filter((r) => r.project_type === k).length;
  const condos = typeOf("condo");
  const towns = typeOf("townhouse");
  const detached = typeOf("single_family");

  // By status
  const selling = all.filter((r) => r.sales_status === "selling").length;
  const comingSoon = all.filter((r) => r.sales_status === "coming_soon").length;

  // Price bands (starting price)
  const bands = [
    { label: "Under $600K", lo: 0, hi: 600_000 },
    { label: "$600K–$800K", lo: 600_000, hi: 800_000 },
    { label: "$800K–$1M", lo: 800_000, hi: 1_000_000 },
    { label: "$1M–$1.5M", lo: 1_000_000, hi: 1_500_000 },
    { label: "$1.5M+", lo: 1_500_000, hi: Infinity },
  ].map((b) => ({
    ...b,
    n: all.filter((r) => r.price_from_public != null && r.price_from_public >= b.lo && r.price_from_public < b.hi).length,
  }));
  const priced = all.map((r) => r.price_from_public).filter((n): n is number => n != null);
  const medianFrom = priced.length
    ? priced.sort((a, b) => a - b)[Math.floor(priced.length / 2)]
    : null;

  // By completion year (from occupancy text)
  const yearCount = (re: RegExp) => all.filter((r) => re.test(r.occupancy_estimate_text ?? "")).length;
  const years = [
    { label: "2025", n: yearCount(/2025/) },
    { label: "2026", n: yearCount(/2026/) },
    { label: "2027", n: yearCount(/2027/) },
    { label: "2028", n: yearCount(/2028/) },
    { label: "2029+", n: yearCount(/2029|20[3-9]\d/) },
  ];

  const asOf = new Date().toLocaleDateString("en-CA", {
    year: "numeric", month: "long", day: "numeric",
  });

  const maxCity = byCity[0]?.[1] ?? 1;
  const maxBand = Math.max(...bands.map((b) => b.n), 1);
  const maxYear = Math.max(...years.map((y) => y.n), 1);

  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "GTA Pre-Construction Report",
    description:
      "Live inventory of Greater Toronto Area new-construction and pre-construction developments by city, home type, price band, and completion year.",
    url: `${SITE_URL}/reports/gta-pre-construction`,
    creator: { "@type": "Organization", name: "LIQWD", url: SITE_URL },
    dateModified: new Date().toISOString().slice(0, 10),
    spatialCoverage: "Greater Toronto Area, Ontario, Canada",
    variableMeasured: ["Active developments", "Home type", "Starting price", "Estimated completion year"],
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/reports" className="hover:text-ink hover:underline">Reports</Link>
        <span aria-hidden className="mx-1.5 text-slate-300">/</span>
        <span aria-current="page" className="font-medium text-slate-700">GTA Pre-Construction</span>
      </nav>

      <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        GTA Pre-Construction Report
      </h1>
      <p className="mt-3 text-lg text-slate-600">
        A live snapshot of Greater Toronto Area new-construction inventory, tracked
        across builder portals, development applications, and public launches.
        Figures update continuously. As of {asOf}.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active developments" value={total.toLocaleString()} />
        <Stat label="Cities tracked" value={String(byCity.length)} />
        <Stat label="Now selling" value={selling.toLocaleString()} />
        <Stat label="Median starting price" value={medianFrom ? fmtMoney(medianFrom) : "—"} />
      </div>

      {/* By city */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">Active developments by city</h2>
        <div className="mt-4 space-y-1.5">
          {byCity.slice(0, 16).map(([city, n]) => (
            <Link
              key={city}
              href={`/new-homes/${plainSlug(city)}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <span className="w-32 shrink-0 text-sm font-medium text-slate-700">{city}</span>
              <span className="h-3 rounded bg-brand-500" style={{ width: `${Math.max(4, (n / maxCity) * 100)}%` }} aria-hidden />
              <span className="text-sm tabular-nums text-slate-500">{n}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* By type */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">By home type</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Condo projects" value={condos.toLocaleString()} />
          <Stat label="Townhome projects" value={towns.toLocaleString()} />
          <Stat label="Single-family projects" value={detached.toLocaleString()} />
        </div>
      </section>

      {/* Price distribution */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">By starting-price band</h2>
        <div className="mt-4 space-y-1.5">
          {bands.map((b) => (
            <div key={b.label} className="flex items-center gap-3 px-2 py-1.5">
              <span className="w-28 shrink-0 text-sm font-medium text-slate-700">{b.label}</span>
              <span className="h-3 rounded bg-emerald-500" style={{ width: `${Math.max(4, (b.n / maxBand) * 100)}%` }} aria-hidden />
              <span className="text-sm tabular-nums text-slate-500">{b.n}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Completion timeline */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">By estimated completion</h2>
        <p className="mt-1 text-sm text-slate-500">
          Where a project publishes an occupancy estimate.
        </p>
        <div className="mt-4 space-y-1.5">
          {years.map((y) => (
            <div key={y.label} className="flex items-center gap-3 px-2 py-1.5">
              <span className="w-16 shrink-0 text-sm font-medium text-slate-700">{y.label}</span>
              <span className="h-3 rounded bg-indigo-500" style={{ width: `${Math.max(4, (y.n / maxYear) * 100)}%` }} aria-hidden />
              <span className="text-sm tabular-nums text-slate-500">{y.n}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Cite / methodology */}
      <section className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Methodology &amp; citation</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Figures reflect active for-sale new-construction developments in the
          Greater Toronto Area listed on LIQWD as of {asOf}, aggregated from
          builder portals, municipal development activity, and public launches.
          A development is counted once; rentals are excluded. Completion figures
          count only projects that publish an occupancy estimate.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Cite this report:</span>{" "}
          LIQWD, “GTA Pre-Construction Report,” {SITE_URL.replace(/^https?:\/\//, "")}/reports/gta-pre-construction,
          accessed {asOf}.
        </p>
      </section>

      <p className="mt-10 text-sm text-slate-600">
        Explore the inventory:{" "}
        {byCity.slice(0, 5).map(([c], i) => (
          <span key={c}>
            {i > 0 ? ", " : ""}
            <Link href={`/new-homes/${plainSlug(c)}`} className="font-medium text-brand-700 hover:underline">{c}</Link>
          </span>
        ))}
        .
      </p>
    </div>
  );
}
