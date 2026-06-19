import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUserProfile, isDeveloper, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { RFP_STATUS, rfpTypeLabel, dealSideLabel } from "@/lib/status";
import type { RfpStatus } from "@/lib/status";
import { formatPriceBand } from "@/lib/types";

export const metadata: Metadata = { title: "Move inventory" };
export const dynamic = "force-dynamic";

interface RfpRow {
  id: string;
  title: string;
  rfp_type: string;
  deal_side: string;
  status: RfpStatus;
  target_units: number | null;
  target_price: number | null;
  deadline_at: string | null;
  created_at: string;
}

export default async function DealRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { profile, userId } = await requireUserProfile();
  const { created } = await searchParams;

  if (!isDeveloper(profile) && !isAdmin(profile)) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            This is for developer accounts.
          </CardBody>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: rfpData } = await supabase
    .from("deal_rfps")
    .select(
      "id, title, rfp_type, deal_side, status, target_units, target_price, deadline_at, created_at",
    )
    .eq("created_by_user_id", userId)
    .order("created_at", { ascending: false });
  const rfps = (rfpData as RfpRow[] | null) ?? [];

  // Proposal counts per RFP (RLS lets the owner read proposals on their RFPs).
  const counts = new Map<string, number>();
  if (rfps.length > 0) {
    const { data: props } = await supabase
      .from("deal_rfp_proposals")
      .select("rfp_id")
      .in(
        "rfp_id",
        rfps.map((r) => r.id),
      );
    for (const p of (props as { rfp_id: string }[]) ?? []) {
      counts.set(p.rfp_id, (counts.get(p.rfp_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <Header />
      {created ? <Notice tone="success">Offer posted.</Notice> : null}

      {rfps.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            You haven&apos;t posted any offers yet.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rfps.map((r) => {
            const n = counts.get(r.id) ?? 0;
            return (
              <Card key={r.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/deal-requests/${r.id}`}
                      className="font-medium text-slate-800 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {[
                        rfpTypeLabel(r.rfp_type),
                        dealSideLabel(r.deal_side),
                        r.target_units ? `${r.target_units} units` : null,
                        r.target_price ? formatPriceBand(r.target_price, null) : null,
                        `${n} proposal${n === 1 ? "" : "s"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge tone={RFP_STATUS[r.status].tone}>
                    {RFP_STATUS[r.status].label}
                  </Badge>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Move inventory
        </h1>
        <p className="mt-1 text-slate-500">
          Post your priority units and incentives to Ultra agents, then review
          the proposals they send back.
        </p>
      </div>
      <ButtonLink href="/dashboard/deal-requests/new" size="sm">
        <Plus className="size-4" aria-hidden /> Post an offer
      </ButtonLink>
    </div>
  );
}
