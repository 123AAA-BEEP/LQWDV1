import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { plainSlug } from "@/lib/slug";
import { ValuationForm } from "./valuation-form";

export const metadata: Metadata = {
  title: "What's My Home Worth? Free Professional Assessment (Ontario)",
  description:
    "Find out what your house, townhome, or condo is worth. A licensed local agent prepares a free, no-obligation market assessment — not an automated guess.",
  alternates: { canonical: "/home-value" },
};
export const dynamic = "force-dynamic";

/**
 * Seller-lead funnel hub. Honest positioning: we don't fake an instant
 * algorithmic estimate (no sold-comparables feed) — the offer is a free CMA
 * prepared by a licensed local agent, which is what valuation funnels
 * actually fulfil anyway. City pages at /home-value/[city] carry the local
 * query variants.
 */
export default async function HomeValuePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("city, province")
    .not("city", "is", null)
    .limit(2000);
  // Ontario-first: the CMA promise is fulfilled by Ontario agents today.
  const cities = [
    ...new Set(
      ((data ?? []) as { city: string; province: string | null }[])
        .filter((r) => !r.province || /^(on|ontario)$/i.test(r.province.trim()))
        .map((r) => r.city),
    ),
  ].sort();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink">
        What&apos;s your home worth?
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        Get a free, no-obligation market assessment of your house, townhome,
        or condo — prepared by a licensed local agent from recent sales around
        your property, not an automated guess.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr,320px]">
        <Card>
          <CardBody>
            <ValuationForm />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink">How it works</h2>
              <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm text-slate-600">
                <li>Tell us about your property — two minutes.</li>
                <li>
                  A licensed local agent reviews recent comparable sales in
                  your neighbourhood.
                </li>
                <li>
                  You get a written market assessment, usually within one
                  business day. No obligation, no pressure.
                </li>
              </ol>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h2 className="font-semibold text-ink">Why not an instant estimate?</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Automated numbers can miss renovations, lot differences, and
                street-by-street shifts. A human assessment from local sales
                data is what a bank, buyer, or lawyer would actually take
                seriously.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {cities.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
            Home values by city
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {cities.slice(0, 40).map((c) => (
              <Link
                key={c}
                href={`/home-value/${plainSlug(c)}`}
                className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                {c}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
