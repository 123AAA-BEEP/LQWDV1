import type { Metadata } from "next";
import {
  Coins,
  MapPin,
  ShieldCheck,
  Clock,
  HandCoins,
  Send,
} from "lucide-react";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Quick Wins" };
export const dynamic = "force-dynamic";

interface Terms {
  project_id: string;
  referral_fee_type: string | null;
  referral_fee_value: number | null;
  referral_fee_notes: string | null;
  min_lease_term_months: number | null;
  min_credit_band: string | null;
  pets_allowed: boolean | null;
  service_mode: string;
}
interface Proj {
  id: string;
  slug: string;
  project_name: string;
  city: string | null;
  neighbourhood: string | null;
  hero_image_url: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
}

const cad = (n: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

function feeLabel(type: string | null, value: number | null): string | null {
  if (!type || value == null) return null;
  if (type === "months_rent")
    return value === 1 ? "1 month's rent" : `${value} months' rent`;
  if (type === "percent_first_year") return `${value}% of first-year rent`;
  if (type === "flat") return `${cad(value)} flat`;
  return null;
}

function estimate(
  type: string | null,
  value: number | null,
  rent: number | null,
): number | null {
  if (!type || value == null) return null;
  if (type === "flat") return value;
  if (!rent) return null;
  if (type === "months_rent") return value * rent;
  if (type === "percent_first_year") return (value / 100) * rent * 12;
  return null;
}

const CREDIT_LABEL: Record<string, string> = {
  excellent: "Excellent",
  good: "Good+",
  fair: "Fair+",
  poor: "Any",
  unknown: "Any",
};

export default async function QuickWins() {
  const { profile } = await requireUserProfile();
  const approved = isApproved(profile);

  let cards: { terms: Terms; proj: Proj }[] = [];
  if (approved) {
    const supabase = await createClient();
    const { data: terms } = await supabase
      .from("project_rental_referral_terms")
      .select(
        "project_id, referral_fee_type, referral_fee_value, referral_fee_notes, min_lease_term_months, min_credit_band, pets_allowed, service_mode",
      )
      .eq("accepts_referrals", true)
      .eq("is_active", true);
    const termRows = (terms as Terms[] | null) ?? [];
    const ids = termRows.map((t) => t.project_id);
    if (ids.length) {
      // Base `projects` is admin-only (migration 0004); approved realtors read
      // the broker-safe view. Join the two in JS.
      const { data: projs } = await supabase
        .from("broker_projects_view")
        .select(
          "id, slug, project_name, city, neighbourhood, hero_image_url, price_from_public, price_to_public",
        )
        .in("id", ids)
        .eq("record_status", "published");
      const byId = new Map(
        ((projs as Proj[] | null) ?? []).map((p) => [p.id, p]),
      );
      cards = termRows
        .map((t) => ({ terms: t, proj: byId.get(t.project_id) }))
        .filter((c): c is { terms: Terms; proj: Proj } => !!c.proj);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero — the money pitch */}
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <div className="p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            <Coins className="size-3" strokeWidth={2} aria-hidden /> Earn
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Quick Wins — get paid to refer renters
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Refer a client to a purpose-built rental and earn a fee when they
            sign — the building&rsquo;s leasing team handles the showings,
            screening, and paperwork. Low effort, fast payout, and you keep the
            client for their future purchase.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Send className="size-3.5 text-emerald-600" aria-hidden /> Refer in
              minutes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-emerald-600" aria-hidden /> Paid on
              signed lease
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HandCoins className="size-3.5 text-emerald-600" aria-hidden /> Fee
              paid to your brokerage
            </span>
          </div>
        </div>
      </div>

      {!approved ? (
        <Card>
          <CardBody className="flex flex-col items-start gap-3 text-sm text-slate-600">
            <ShieldCheck className="size-6 text-slate-400" aria-hidden />
            <p>
              Get verified to unlock referral income and see which buildings are
              paying right now.
            </p>
            <ButtonLink href="/dashboard/verify">Start verification</ButtonLink>
          </CardBody>
        </Card>
      ) : cards.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No buildings are paying for referrals just yet — check back soon. New
            purpose-built-rental partners are added regularly.
          </CardBody>
        </Card>
      ) : (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Paying now ({cards.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ terms, proj }) => {
              const rent = proj.price_from_public ?? proj.price_to_public;
              const est = estimate(
                terms.referral_fee_type,
                terms.referral_fee_value,
                rent,
              );
              const fee = feeLabel(
                terms.referral_fee_type,
                terms.referral_fee_value,
              );
              return (
                <Card
                  key={proj.id}
                  className="flex h-full flex-col overflow-hidden"
                >
                  <div className="flex aspect-video items-center justify-center overflow-hidden bg-slate-100">
                    {proj.hero_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proj.hero_image_url}
                        alt={proj.project_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Coins className="size-8 text-slate-300" aria-hidden />
                    )}
                  </div>
                  <CardBody className="flex flex-1 flex-col">
                    <h3 className="font-semibold text-ink">
                      {proj.project_name}
                    </h3>
                    <p className="flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="size-3.5 text-slate-400" aria-hidden />
                      {[proj.neighbourhood, proj.city]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>

                    <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        You earn
                      </p>
                      <p className="text-lg font-semibold text-emerald-800">
                        {est ? `≈ ${cad(est)}` : (fee ?? "Referral fee")}
                        {rent ? (
                          <span className="text-xs font-normal text-emerald-700">
                            {" "}
                            · {cad(rent)}/mo
                          </span>
                        ) : null}
                      </p>
                      {fee && est ? (
                        <p className="text-xs text-emerald-700">
                          {fee} per signed lease
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {terms.min_lease_term_months ? (
                        <Badge tone="neutral">
                          {terms.min_lease_term_months}+ mo lease
                        </Badge>
                      ) : null}
                      {terms.min_credit_band ? (
                        <Badge tone="neutral">
                          {CREDIT_LABEL[terms.min_credit_band] ??
                            terms.min_credit_band}{" "}
                          credit
                        </Badge>
                      ) : null}
                      {terms.pets_allowed === true ? (
                        <Badge tone="success">Pets OK</Badge>
                      ) : terms.pets_allowed === false ? (
                        <Badge tone="neutral">No pets</Badge>
                      ) : null}
                    </div>

                    {terms.referral_fee_notes ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {terms.referral_fee_notes}
                      </p>
                    ) : null}

                    <div className="mt-4 flex-1" />
                    <ButtonLink href={`/dashboard/projects/${proj.slug}`} size="sm">
                      View &amp; refer →
                    </ButtonLink>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
