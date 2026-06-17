import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Plus, ShieldCheck } from "lucide-react";
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

  // Developer marketplace is Stage 2 (pending monetization).
  if (isDeveloper(profile) && !admin) {
    return (
      <div className="space-y-6">
        <Header isPro={false} canCreate={false} />
        <Card>
          <CardBody className="text-center">
            <ClipboardCheck className="mx-auto size-8 text-slate-300" strokeWidth={1.5} aria-hidden />
            <h2 className="mt-3 text-lg font-semibold text-ink">
              Buyer mandate marketplace — coming soon
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Browse verified buyer mandates that match your inventory and
              connect with the broker. We&apos;ll let you know the moment it
              opens.
            </p>
          </CardBody>
        </Card>
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
