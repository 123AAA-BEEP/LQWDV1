import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RFP_STATUS,
  RFP_PROPOSAL_STATUS,
  rfpTypeLabel,
  dealSideLabel,
  RFP_VISIBILITY_LABELS,
} from "@/lib/status";
import type { RfpStatus, RfpProposalStatus } from "@/lib/status";
import { formatPriceBand } from "@/lib/types";
import { setRfpStatus, respondToProposal } from "../actions";

export const metadata: Metadata = { title: "Deal request" };
export const dynamic = "force-dynamic";

interface Rfp {
  id: string;
  title: string;
  rfp_type: string;
  deal_side: string;
  status: RfpStatus;
  brief: string | null;
  target_units: number | null;
  target_price: number | null;
  deadline_at: string | null;
  visibility: string;
  hidden_fields: string[];
}
interface Proposal {
  id: string;
  submitted_by_user_id: string;
  price_offer: number | null;
  units: number | null;
  conditions: string | null;
  narrative: string | null;
  status: RfpProposalStatus;
  created_at: string;
}

export default async function DealRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserProfile();
  const { id } = await params;

  const supabase = await createClient();
  // RLS: base-table read is the creator (or admin).
  const { data } = await supabase
    .from("deal_rfps")
    .select(
      "id, title, rfp_type, deal_side, status, brief, target_units, target_price, deadline_at, visibility, hidden_fields",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const r = data as Rfp;

  const { data: propData } = await supabase
    .from("deal_rfp_proposals")
    .select(
      "id, submitted_by_user_id, price_offer, units, conditions, narrative, status, created_at",
    )
    .eq("rfp_id", id)
    .order("created_at", { ascending: false });
  const proposals = (propData as Proposal[] | null) ?? [];

  // Responding realtor identities (owner is authorized — they own the RFP).
  const names = new Map<string, string>();
  const ids = [...new Set(proposals.map((p) => p.submitted_by_user_id))];
  if (ids.length > 0) {
    const { data: people } = await createAdminClient()
      .from("profiles")
      .select("id, first_name, last_name, brokerage_name")
      .in("id", ids);
    for (const p of (people as { id: string; first_name: string | null; last_name: string | null; brokerage_name: string | null }[]) ?? []) {
      names.set(
        p.id,
        [[p.first_name, p.last_name].filter(Boolean).join(" "), p.brokerage_name]
          .filter(Boolean)
          .join(" · ") || "A realtor",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/deal-requests" className="text-sm text-brand-700 hover:underline">
          ← Deal requests
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={RFP_STATUS[r.status].tone}>{RFP_STATUS[r.status].label}</Badge>
          <span className="text-xs text-slate-400">
            {rfpTypeLabel(r.rfp_type)} · {dealSideLabel(r.deal_side)} ·{" "}
            {RFP_VISIBILITY_LABELS[r.visibility] ?? r.visibility}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {r.title}
        </h1>
      </div>

      <Card>
        <CardBody className="space-y-4">
          {r.brief ? <p className="leading-relaxed text-slate-600">{r.brief}</p> : null}
          <dl className="grid gap-3 sm:grid-cols-3">
            <Detail label="Target units" value={r.target_units ? String(r.target_units) : null} />
            <Detail label="Target price" value={r.target_price ? formatPriceBand(r.target_price, null) : null} />
            <Detail
              label="Deadline"
              value={r.deadline_at ? new Date(r.deadline_at).toLocaleDateString("en-CA") : null}
            />
          </dl>
          {r.hidden_fields.length > 0 ? (
            <p className="text-xs text-slate-400">
              Hidden from realtors: {r.hidden_fields.join(", ")}
            </p>
          ) : null}

          {/* Status controls */}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {r.status === "draft" ? (
              <StatusButton rfpId={r.id} status="open" label="Publish" />
            ) : null}
            {r.status === "open" || r.status === "shortlisting" ? (
              <StatusButton rfpId={r.id} status="closed" label="Close" variant="secondary" />
            ) : null}
            {r.status === "closed" ? (
              <StatusButton rfpId={r.id} status="open" label="Reopen" variant="secondary" />
            ) : null}
          </div>
        </CardBody>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Proposals ({proposals.length})
        </h2>
        {proposals.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No proposals yet. {r.status === "draft" ? "Publish to start receiving them." : "We'll notify you as they arrive."}
            </CardBody>
          </Card>
        ) : (
          proposals.map((p) => (
            <Card key={p.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {names.get(p.submitted_by_user_id) ?? "A realtor"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[
                        p.price_offer ? formatPriceBand(p.price_offer, null) : null,
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
                {p.narrative ? <p className="text-sm text-slate-600">{p.narrative}</p> : null}
                {p.conditions ? (
                  <p className="text-sm text-slate-500">
                    <span className="font-medium text-slate-700">Conditions:</span> {p.conditions}
                  </p>
                ) : null}
                {p.status === "submitted" || p.status === "shortlisted" ? (
                  <div className="flex flex-wrap gap-2">
                    {p.status === "submitted" ? (
                      <ProposalButton proposalId={p.id} rfpId={r.id} decision="shortlisted" label="Shortlist" variant="secondary" />
                    ) : null}
                    <ProposalButton proposalId={p.id} rfpId={r.id} decision="awarded" label="Award" />
                    <ProposalButton proposalId={p.id} rfpId={r.id} decision="declined" label="Decline" variant="secondary" />
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

function StatusButton({
  rfpId,
  status,
  label,
  variant = "primary",
}: {
  rfpId: string;
  status: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <form action={setRfpStatus}>
      <input type="hidden" name="rfp_id" value={rfpId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

function ProposalButton({
  proposalId,
  rfpId,
  decision,
  label,
  variant = "primary",
}: {
  proposalId: string;
  rfpId: string;
  decision: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <form action={respondToProposal}>
      <input type="hidden" name="proposal_id" value={proposalId} />
      <input type="hidden" name="rfp_id" value={rfpId} />
      <input type="hidden" name="decision" value={decision} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}
