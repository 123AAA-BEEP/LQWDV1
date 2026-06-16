import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import {
  RFP_STATUS,
  RFP_PROPOSAL_STATUS,
  RFP_VISIBILITY_LABELS,
  rfpTypeLabel,
  dealSideLabel,
} from "@/lib/status";
import type { RfpStatus, RfpProposalStatus } from "@/lib/status";
import { formatPriceBand } from "@/lib/types";
import {
  updateRfpStatus,
  inviteRealtor,
  removeInvitation,
  decideRfpProposal,
} from "../actions";

export const metadata: Metadata = { title: "RFP detail" };
export const dynamic = "force-dynamic";

const NEXT_STATUS: Record<RfpStatus, { value: RfpStatus; label: string }[]> = {
  draft: [{ value: "open", label: "Open for responses" }],
  open: [
    { value: "shortlisting", label: "Move to shortlisting" },
    { value: "cancelled", label: "Cancel" },
  ],
  shortlisting: [
    { value: "awarded", label: "Mark awarded" },
    { value: "closed", label: "Close" },
    { value: "cancelled", label: "Cancel" },
  ],
  awarded: [{ value: "closed", label: "Close" }],
  closed: [],
  cancelled: [],
};

export default async function RfpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rfp } = await supabase
    .from("deal_rfps")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!rfp) notFound();

  const status = rfp.status as RfpStatus;

  const [{ data: invitations }, { data: ultra }, { data: proposals }] =
    await Promise.all([
      supabase
        .from("deal_rfp_invitations")
        .select(
          "id, profile_id, status, invitee:profiles!profile_id(first_name,last_name,email)",
        )
        .eq("rfp_id", id),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("role", "realtor")
        .eq("verification_status", "approved")
        .eq("realtor_tier", "ultra"),
      supabase
        .from("deal_rfp_proposals")
        .select(
          "id, price_offer, units, conditions, narrative, status, admin_notes, created_at, submitter:profiles!submitted_by_user_id(first_name,last_name,email)",
        )
        .eq("rfp_id", id)
        .order("created_at", { ascending: true }),
    ]);

  type Invite = {
    id: string;
    profile_id: string;
    status: string;
    invitee: { first_name: string | null; last_name: string | null; email: string | null } | null;
  };
  type Ultra = { id: string; first_name: string | null; last_name: string | null; email: string | null };
  type Prop = {
    id: string;
    price_offer: number | null;
    units: number | null;
    conditions: string | null;
    narrative: string | null;
    status: RfpProposalStatus;
    admin_notes: string | null;
    created_at: string;
    submitter: { first_name: string | null; last_name: string | null; email: string | null } | null;
  };

  const inviteRows = (invitations as unknown as Invite[]) ?? [];
  const ultraRows = (ultra as unknown as Ultra[]) ?? [];
  const propRows = (proposals as unknown as Prop[]) ?? [];

  const invitedIds = new Set(inviteRows.map((i) => i.profile_id));
  const invitable = ultraRows.filter((u) => !invitedIds.has(u.id));
  const personName = (p: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null) =>
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
    p?.email ||
    "Unknown";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/rfps"
          className="text-sm text-brand-700 hover:underline"
        >
          ← Back to RFPs
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {rfp.title}
            </h1>
            <p className="text-slate-500">
              {rfpTypeLabel(rfp.rfp_type)} · {dealSideLabel(rfp.deal_side)} ·{" "}
              {RFP_VISIBILITY_LABELS[rfp.visibility] ?? rfp.visibility}
            </p>
          </div>
          <Badge tone={RFP_STATUS[status].tone}>{RFP_STATUS[status].label}</Badge>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-3">
          {rfp.brief ? (
            <p className="leading-relaxed text-slate-600">{rfp.brief}</p>
          ) : (
            <p className="text-sm text-slate-400">No brief provided.</p>
          )}
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            {rfp.target_units != null ? (
              <Fact label="Target units" value={String(rfp.target_units)} />
            ) : null}
            {rfp.target_price != null ? (
              <Fact
                label="Target price"
                value={formatPriceBand(rfp.target_price, null) ?? "—"}
              />
            ) : null}
            {rfp.deadline_at ? (
              <Fact
                label="Deadline"
                value={new Date(rfp.deadline_at).toLocaleDateString("en-CA")}
              />
            ) : null}
          </dl>

          {NEXT_STATUS[status].length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {NEXT_STATUS[status].map((s) => (
                <form key={s.value} action={updateRfpStatus}>
                  <input type="hidden" name="rfp_id" value={rfp.id} />
                  <input type="hidden" name="status" value={s.value} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={s.value === "cancelled" ? "danger" : "secondary"}
                  >
                    {s.label}
                  </Button>
                </form>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {rfp.visibility === "invited" ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Invitations ({inviteRows.length})
          </h2>
          <Card>
            <CardBody className="space-y-4">
              {inviteRows.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {inviteRows.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-sm text-slate-700">
                        {personName(i.invitee)}
                      </span>
                      <form action={removeInvitation}>
                        <input type="hidden" name="invitation_id" value={i.id} />
                        <input type="hidden" name="rfp_id" value={rfp.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Remove
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No one invited yet.</p>
              )}

              {invitable.length > 0 ? (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Invite an ultra realtor
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {invitable.map((u) => (
                      <li key={u.id}>
                        <form action={inviteRealtor}>
                          <input type="hidden" name="rfp_id" value={rfp.id} />
                          <input type="hidden" name="profile_id" value={u.id} />
                          <Button type="submit" size="sm" variant="secondary">
                            + {personName(u)}
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
                  No more ultra realtors to invite. Promote agents on the{" "}
                  <Link
                    href="/dashboard/admin/realtors"
                    className="text-brand-700 hover:underline"
                  >
                    Realtors
                  </Link>{" "}
                  tab.
                </p>
              )}
            </CardBody>
          </Card>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Responses ({propRows.length})
        </h2>
        {propRows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No responses yet.
            </CardBody>
          </Card>
        ) : (
          propRows.map((p) => (
            <Card key={p.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {personName(p.submitter)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  <Badge tone={RFP_PROPOSAL_STATUS[p.status].tone}>
                    {RFP_PROPOSAL_STATUS[p.status].label}
                  </Badge>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {p.price_offer != null ? (
                    <Fact
                      label="Price offer"
                      value={formatPriceBand(p.price_offer, null) ?? "—"}
                    />
                  ) : null}
                  {p.units != null ? (
                    <Fact label="Units" value={String(p.units)} />
                  ) : null}
                  {p.conditions ? (
                    <Fact label="Conditions" value={p.conditions} full />
                  ) : null}
                  {p.narrative ? (
                    <Fact label="Pitch" value={p.narrative} full />
                  ) : null}
                </dl>

                <form
                  action={decideRfpProposal}
                  className="space-y-2 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="proposal_id" value={p.id} />
                  <input type="hidden" name="rfp_id" value={rfp.id} />
                  <Textarea
                    name="admin_notes"
                    placeholder="Notes to the realtor (optional)…"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" name="status" value="shortlisted" size="sm" variant="secondary">
                      Shortlist
                    </Button>
                    <Button type="submit" name="status" value="awarded" size="sm">
                      Award
                    </Button>
                    <Button type="submit" name="status" value="declined" size="sm" variant="danger">
                      Decline
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

function Fact({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}
