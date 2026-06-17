import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPriceBand, isMandateVerified } from "@/lib/types";
import type { BuyerMandate } from "@/lib/types";

export const metadata: Metadata = { title: "Buyer mandate" };
export const dynamic = "force-dynamic";

const PREAPPROVAL_LABEL: Record<string, string> = {
  none: "None",
  pre_qualified: "Pre-qualified",
  pre_approved: "Pre-approved",
};

export default async function MandateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserProfile();
  const { id } = await params;

  const supabase = await createClient();
  // RLS limits this to the submitting broker or an admin.
  const { data } = await supabase
    .from("buyer_mandates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const m = data as BuyerMandate;
  const verified = isMandateVerified(m);
  const band = formatPriceBand(m.price_min, m.price_max);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/buyer-mandates" className="text-sm text-brand-700 hover:underline">
          ← Buyer mandates
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{m.status}</Badge>
          {verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <ShieldCheck className="size-3.5" aria-hidden /> Verified
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-400">Unverified</span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {m.buyer_label || "Buyer mandate"}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Criteria
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Price" value={band} />
              <Detail label="Financing" value={cap(m.financing_type)} />
              <Detail label="Areas" value={m.location_areas} />
              <Detail label="Radius" value={m.location_radius_km ? `${m.location_radius_km} km` : null} />
              <Detail label="Property type" value={cap(m.property_type)} />
              <Detail label="Condition" value={cap(m.condition)} />
              <Detail
                label="Size"
                value={
                  m.size_sqft_min || m.size_sqft_max
                    ? `${m.size_sqft_min ?? "?"}–${m.size_sqft_max ?? "?"} sq ft`
                    : null
                }
              />
              <Detail label="Beds / baths" value={m.beds_min || m.baths_min ? `${m.beds_min ?? "?"} bd / ${m.baths_min ?? "?"} ba` : null} />
              <Detail label="Timeline" value={m.timeline} />
              <Detail label="Must-haves" value={m.must_haves} full />
              <Detail label="Nice-to-haves" value={m.nice_to_haves} full />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Verification
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Pre-approval" value={PREAPPROVAL_LABEL[m.pre_approval_status]} />
              <Detail label="Amount" value={m.pre_approval_amount ? formatPriceBand(m.pre_approval_amount, null) : null} />
              <Detail label="Lender" value={m.lender} />
              <Detail label="Expiry" value={m.pre_approval_expiry} />
              <Detail label="Proof of funds" value={m.proof_of_funds ? "On file" : "No"} />
              <Detail label="Rep agreement" value={m.rep_agreement_signed ? "Signed" : "No"} />
            </dl>
            <p className="mt-4 text-xs text-slate-400">
              Verification is self-reported for now; document upload &amp;
              automated checks are coming.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function cap(v: string | null): string | null {
  if (!v) return null;
  return v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}
