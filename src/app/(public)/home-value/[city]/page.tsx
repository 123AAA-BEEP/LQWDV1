import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { plainSlug } from "@/lib/slug";
import { ValuationForm } from "../valuation-form";

export const dynamic = "force-dynamic";

/**
 * Programmatic seller-lead pages — /home-value/toronto, /home-value/whitby…
 * Targets "what is my home worth {city}" / "{city} home value" queries. The
 * market-context module is computed live from OUR new-construction inventory
 * (always true, unique per city); the assessment itself is a local agent's
 * CMA — same honest model as the hub.
 */

async function resolveCity(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("city")
    .not("city", "is", null)
    .limit(2000);
  const cities = [
    ...new Set(((data ?? []) as { city: string }[]).map((r) => r.city)),
  ];
  return cities.find((c) => plainSlug(c) === slug) ?? null;
}

interface CityRow {
  project_type: string | null;
  price_from_public: number | null;
  sales_status: string | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await resolveCity(slug);
  if (!city) return { title: "Home value" };
  return {
    title: `What's My Home Worth in ${city}? Free Assessment`,
    description: `Find out what your ${city} house, townhome, or condo is worth. A licensed local agent prepares a free, no-obligation market assessment from recent ${city} sales.`,
    alternates: { canonical: `/home-value/${slug}` },
  };
}

export default async function CityHomeValuePage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = await resolveCity(slug);
  if (!city) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("project_type, price_from_public, sales_status")
    .eq("city", city)
    .limit(500);
  const rows = ((data ?? []) as CityRow[]).filter(
    (r) => r.price_from_public != null,
  );
  const prices = rows.map((r) => r.price_from_public as number);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const activeCount = rows.filter((r) => r.sales_status === "selling").length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <nav className="text-sm text-slate-400">
        <Link href="/home-value" className="hover:text-slate-600">
          Home values
        </Link>{" "}
        / <span>{city}</span>
      </nav>
      <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-ink">
        What&apos;s your {city} home worth?
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        Whether it&apos;s a detached house, townhome, or condo — a licensed
        local agent will prepare a free, no-obligation market assessment of
        your {city} property from recent nearby sales.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr,320px]">
        <Card>
          <CardBody>
            <ValuationForm defaultCity={city} sourceCitySlug={slug} />
          </CardBody>
        </Card>

        <div className="space-y-4">
          {minPrice ? (
            <Card>
              <CardBody>
                <h2 className="font-semibold text-ink">
                  {city} market context
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  On LIQWD&apos;s tracked inventory, new-construction homes in{" "}
                  {city} start from about $
                  {Math.round(minPrice).toLocaleString("en-CA")}
                  {activeCount > 0
                    ? `, with ${activeCount} development${activeCount === 1 ? "" : "s"} actively selling`
                    : ""}
                  . New-build pricing is one signal buyers weigh against
                  resale homes like yours — your assessment puts a real number
                  on it.
                </p>
                <Link
                  href={`/new-homes/${slug}`}
                  className="mt-3 inline-block text-sm text-brand-700 hover:underline"
                >
                  See new construction in {city} →
                </Link>
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink">How it works</h2>
              <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm text-slate-600">
                <li>Tell us about your property — two minutes.</li>
                <li>
                  A licensed {city} agent reviews recent comparable sales
                  around your street.
                </li>
                <li>
                  You get a written assessment, usually within one business
                  day. No obligation.
                </li>
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
