import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { MatchWizard } from "./wizard";

export const dynamic = "force-dynamic";

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const city = first(sp.city).trim();
  return {
    title: city
      ? `Find the Best Real Estate Agent in ${city} — Free Matching`
      : "Find the Best Real Estate Agent — Free Matching | LIQWD",
    description: `Get matched with a verified${city ? ` ${city}` : ""} real estate agent in under two minutes. Real profiles, verified client reviews, free with no obligation.`,
    alternates: { canonical: "/match" },
  };
}

/**
 * The agent-match wizard page. City-personalized headline via ?city= (ad
 * landing pattern), ?intent= preselect later if we want per-campaign
 * variants. Unlike the funnel we adapted, matched agents are revealed
 * instantly as real, reviewable profiles — no email gate, no SMS wall.
 */
export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const cityParam = first(sp.city).trim();
  const source = first(sp.src).trim() || first(sp.utm_source).trim();

  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("city, province")
    .not("city", "is", null)
    .limit(2000);
  const cities = [
    ...new Set(
      ((data ?? []) as { city: string; province: string | null }[])
        .filter((r) => !r.province || /^(on|ontario)$/i.test(r.province.trim()))
        .map((r) => r.city),
    ),
  ].sort();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-balance text-center text-4xl font-semibold tracking-tight text-ink">
        Find the best real estate agent
        {cityParam ? (
          <>
            {" "}
            in <span className="text-brand-700">{cityParam}</span>
          </>
        ) : null}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-lg text-slate-600">
        Answer a few quick questions and see a shortlist of verified agents —
        real profiles with real client reviews. Under two minutes, free, no
        obligation.
      </p>

      <Card className="mt-8">
        <CardBody className="p-6 sm:p-8">
          <MatchWizard
            cities={cities}
            defaultCity={cityParam || undefined}
            source={source || undefined}
          />
        </CardBody>
      </Card>

      <ul className="mx-auto mt-6 max-w-xl space-y-1.5 text-sm text-slate-500">
        <li>✓ Every agent is licence-verified before appearing on LIQWD</li>
        <li>✓ Client reviews are moderated — no fake ratings, ever</li>
        <li>✓ You choose who to work with; there&apos;s never an obligation</li>
      </ul>
    </div>
  );
}
