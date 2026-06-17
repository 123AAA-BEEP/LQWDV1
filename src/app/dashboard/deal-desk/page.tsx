import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isApproved, isUltra } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import {
  RFP_STATUS,
  RFP_PROPOSAL_STATUS,
  rfpTypeLabel,
  dealSideLabel,
} from "@/lib/status";
import type { RfpStatus, RfpProposalStatus } from "@/lib/status";
import { formatPriceBand } from "@/lib/types";
import { withdrawRfpProposal } from "./actions";

export const metadata: Metadata = { title: "Deal Desk" };
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
}

interface MyResponse {
  id: string;
  price_offer: number | null;
  units: number | null;
  status: RfpProposalStatus;
  admin_notes: string | null;
  created_at: string;
  rfp: { id: string; title: string } | null;
}

export default async function DealDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const { userId, profile } = await requireUserProfile();

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <Header />
        <VerificationRequired />
      </div>
    );
  }

  if (!isUltra(profile)) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardBody className="text-center">
            <h2 className="text-lg font-semibold text-ink">Invitation only</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              The Deal Desk is reserved for LIQWD <strong>Ultra</strong>{" "}
              realtors — vetted agents invited to respond to developer{" "}
              <strong>deal requests</strong> (formally, Requests for Proposals,
              or “RFPs”): bulk purchases, listing mandates, inventory and trouble
              units, and full developments. We extend access by invitation.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  // Realtors read RFPs through the masked view (hidden fields are nulled and
  // the base deal_rfps table is admin-only). The view re-applies eligibility.
  const [{ data: open }, { data: mine }] = await Promise.all([
    supabase
      .from("deal_rfps_realtor_view")
      .select(
        "id, title, rfp_type, deal_side, status, target_units, target_price, deadline_at",
      )
      .in("status", ["open", "shortlisting"])
      .order("deadline_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("deal_rfp_proposals")
      .select("id, price_offer, units, status, admin_notes, created_at, rfp_id")
      .eq("submitted_by_user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const rfps = (open as unknown as RfpRow[]) ?? [];
  const proposalRows =
    (mine as unknown as (Omit<MyResponse, "rfp"> & { rfp_id: string })[]) ?? [];

  // Resolve RFP titles through the masked view (base table is admin-only).
  const rfpIds = [...new Set(proposalRows.map((p) => p.rfp_id))];
  const titleById = new Map<string, string>();
  if (rfpIds.length > 0) {
    const { data: titleRows } = await supabase
      .from("deal_rfps_realtor_view")
      .select("id, title")
      .in("id", rfpIds);
    for (const t of (titleRows ?? []) as { id: string; title: string }[]) {
      titleById.set(t.id, t.title);
    }
  }
  const responses: MyResponse[] = proposalRows.map((p) => ({
    id: p.id,
    price_offer: p.price_offer,
    units: p.units,
    status: p.status,
    admin_notes: p.admin_notes,
    created_at: p.created_at,
    rfp: titleById.has(p.rfp_id)
      ? { id: p.rfp_id, title: titleById.get(p.rfp_id) as string }
      : null,
  }));

  return (
    <div className="space-y-8">
      <Header />

      {message === "submitted" ? (
        <Notice tone="success">
          Your response was submitted. We’ll be in touch.
        </Notice>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Open deal requests ({rfps.length})
        </h2>
        {rfps.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No open deal requests right now. We’ll notify you when a new deal
              lands.
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {rfps.map((r) => (
              <Card key={r.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/deal-desk/${r.id}`}
                      className="truncate font-medium text-slate-800 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {rfpTypeLabel(r.rfp_type)} · {dealSideLabel(r.deal_side)}
                      {r.target_units ? ` · ${r.target_units} units` : ""}
                      {r.target_price
                        ? ` · ${formatPriceBand(r.target_price, null)}`
                        : ""}
                      {r.deadline_at
                        ? ` · due ${new Date(r.deadline_at).toLocaleDateString("en-CA")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={RFP_STATUS[r.status].tone}>
                      {RFP_STATUS[r.status].label}
                    </Badge>
                    <Link
                      href={`/dashboard/deal-desk/${r.id}`}
                      className="text-sm text-brand-700 hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      {responses.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            My responses
          </h2>
          <div className="space-y-2">
            {responses.map((p) => (
              <Card key={p.id}>
                <CardBody className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {p.rfp ? (
                          <Link
                            href={`/dashboard/deal-desk/${p.rfp.id}`}
                            className="hover:underline"
                          >
                            {p.rfp.title}
                          </Link>
                        ) : (
                          "Deal request"
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {[
                          p.price_offer
                            ? formatPriceBand(p.price_offer, null)
                            : null,
                          p.units ? `${p.units} units` : null,
                          new Date(p.created_at).toLocaleDateString("en-CA"),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Badge tone={RFP_PROPOSAL_STATUS[p.status].tone}>
                      {RFP_PROPOSAL_STATUS[p.status].label}
                    </Badge>
                  </div>
                  {p.admin_notes ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Admin: {p.admin_notes}
                    </p>
                  ) : null}
                  {p.status === "submitted" ? (
                    <form action={withdrawRfpProposal}>
                      <input type="hidden" name="proposal_id" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Withdraw
                      </Button>
                    </form>
                  ) : null}
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Deal Desk
      </h1>
      <p className="mt-1 text-slate-500">
        Invitation-only developer deal requests — Requests for Proposals (RFPs)
        — for LIQWD Ultra realtors.
      </p>
    </div>
  );
}
