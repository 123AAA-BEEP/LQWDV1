import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Plus, ShieldCheck } from "lucide-react";
import {
  requireUserProfile,
  isApproved,
  isPro,
  isAdmin,
  isDeveloper,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { formatPriceBand, isMandateVerified } from "@/lib/types";
import type { BuyerMandate } from "@/lib/types";

export const metadata: Metadata = { title: "Buyer mandates" };
export const dynamic = "force-dynamic";

const STATUS_TONE = {
  draft: "neutral",
  active: "brand",
  matched: "success",
  closed: "neutral",
} as const;

interface Row extends BuyerMandate {
  broker?: { first_name: string | null; last_name: string | null } | null;
}

export default async function BuyerMandatesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { profile, userId } = await requireUserProfile();
  const { created } = await searchParams;
  const admin = isAdmin(profile);

  if (!admin && !isApproved(profile) && !isDeveloper(profile)) {
    return (
      <div className="space-y-6">
        <Header isPro={false} canCreate={false} />
        <VerificationRequired />
      </div>
    );
  }

  // Developers browse the privacy-safe marketplace (criteria + Verified badge
  // + broker identity; contact exchange is the paywalled "connect", Stage 2b).
  if (isDeveloper(profile) && !admin) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("buyer_mandates_developer_view")
      .select("*")
      .order("created_at", { ascending: false });
    const mandates = (data as unknown as DeveloperRow[] | null) ?? [];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Buyer mandate marketplace
          </h1>
          <p className="mt-1 text-slate-500">
            Active buyer mandates that may match your inventory. Verified
            mandates are backed by pre-approval, funds, and a signed agreement.
          </p>
        </div>
        {mandates.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No active buyer mandates right now. Check back soon.
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mandates.map((m) => (
              <DeveloperMandateCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Approved realtor without Pro → upsell.
  if (!admin && !isPro(profile)) {
    return (
      <div className="space-y-6">
        <Header isPro={false} canCreate={false} />
        <Card>
          <CardBody className="text-center">
            <h2 className="text-lg font-semibold text-ink">A Pro feature</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Buyer Mandates are part of LIQWD Pro. Upgrade to submit a mandate
              and let matching inventory find your buyer automatically.
            </p>
            <div className="mt-4">
              <ButtonLink href="/dashboard/upgrade" size="sm">
                Upgrade to Pro
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  let request = supabase
    .from("buyer_mandates")
    .select(
      admin
        ? "*, broker:profiles!submitted_by_user_id(first_name,last_name)"
        : "*",
    )
    .order("created_at", { ascending: false });
  if (!admin) request = request.eq("submitted_by_user_id", userId);

  const { data } = await request;
  const rows = (data as unknown as Row[] | null) ?? [];

  return (
    <div className="space-y-6">
      <Header isPro={isPro(profile)} canCreate={!admin} />

      {created ? <Notice tone="success">Mandate created.</Notice> : null}

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            {admin
              ? "No buyer mandates submitted yet."
              : "You haven't created any buyer mandates yet."}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => {
            const verified = isMandateVerified(m);
            const band = formatPriceBand(m.price_min, m.price_max);
            const brokerName = m.broker
              ? [m.broker.first_name, m.broker.last_name].filter(Boolean).join(" ")
              : null;
            return (
              <Card key={m.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/buyer-mandates/${m.id}`}
                      className="font-medium text-slate-800 hover:underline"
                    >
                      {m.buyer_label || "Buyer mandate"}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {[
                        band,
                        m.location_areas,
                        m.property_type,
                        admin && brokerName ? `by ${brokerName}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                        <ShieldCheck className="size-3.5" aria-hidden /> Verified
                      </span>
                    ) : null}
                    <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DeveloperRow {
  id: string;
  location_areas: string | null;
  price_min: number | null;
  price_max: number | null;
  property_type: string | null;
  size_sqft_min: number | null;
  size_sqft_max: number | null;
  beds_min: number | null;
  baths_min: number | null;
  timeline: string | null;
  must_haves: string | null;
  verified: boolean;
  broker_first_name: string | null;
  broker_last_name: string | null;
  broker_brokerage: string | null;
}

function DeveloperMandateCard({ m }: { m: DeveloperRow }) {
  const band = formatPriceBand(m.price_min, m.price_max);
  const broker =
    [m.broker_first_name, m.broker_last_name].filter(Boolean).join(" ") || "A broker";
  const size =
    m.size_sqft_min || m.size_sqft_max
      ? `${m.size_sqft_min ?? "?"}–${m.size_sqft_max ?? "?"} sq ft`
      : null;
  const beds = m.beds_min ? `${m.beds_min}+ bd` : null;
  return (
    <Card className="h-full">
      <CardBody className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="font-medium text-ink">{m.location_areas || "Buyer looking"}</span>
          {m.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
              <ShieldCheck className="size-3.5" aria-hidden /> Verified
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {[band, m.property_type, size, beds, m.timeline].filter(Boolean).join(" · ")}
        </p>
        {m.must_haves ? (
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Must-haves:</span> {m.must_haves}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-slate-400">via {broker}{m.broker_brokerage ? ` · ${m.broker_brokerage}` : ""}</p>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-400"
            title="Connecting with brokers is coming soon"
          >
            <Lock className="size-3.5" aria-hidden /> Request connect — soon
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

function Header({ isPro, canCreate }: { isPro: boolean; canCreate: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Buyer mandates
        </h1>
        <p className="mt-1 text-slate-500">
          Submit a hard-to-match buyer and let matching inventory surface to you.
        </p>
      </div>
      {canCreate && isPro ? (
        <ButtonLink href="/dashboard/buyer-mandates/new" size="sm">
          <Plus className="size-4" aria-hidden /> New mandate
        </ButtonLink>
      ) : null}
    </div>
  );
}
