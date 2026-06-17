import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserProfile, isUltra } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  RFP_STATUS,
  RFP_PROPOSAL_STATUS,
  rfpTypeLabel,
  dealSideLabel,
} from "@/lib/status";
import type { RfpStatus, RfpProposalStatus } from "@/lib/status";
import { formatPriceBand } from "@/lib/types";
import { submitRfpProposal } from "../actions";

export const metadata: Metadata = { title: "Deal request" };
export const dynamic = "force-dynamic";

export default async function DealDeskRfpPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { userId, profile } = await requireUserProfile();

  if (!isUltra(profile)) notFound();

  const supabase = await createClient();
  // RLS returns the RFP only if this realtor is eligible to see it.
  const { data: rfp } = await supabase
    .from("deal_rfps")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!rfp) notFound();

  const status = rfp.status as RfpStatus;
  const canRespond = status === "open" || status === "shortlisting";

  // Has this realtor already responded?
  const { data: existing } = await supabase
    .from("deal_rfp_proposals")
    .select("id, price_offer, units, conditions, narrative, status, admin_notes")
    .eq("rfp_id", id)
    .eq("submitted_by_user_id", userId)
    .order("created_at", { ascending: false })
    .maybeSingle();

  const mine = existing as
    | {
        id: string;
        price_offer: number | null;
        units: number | null;
        conditions: string | null;
        narrative: string | null;
        status: RfpProposalStatus;
        admin_notes: string | null;
      }
    | null;

  const alreadyResponded = mine != null && mine.status !== "withdrawn";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/deal-desk"
          className="text-sm text-brand-700 hover:underline"
        >
          ← Back to Deal Desk
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {rfp.title}
            </h1>
            <p className="text-slate-500">
              {rfpTypeLabel(rfp.rfp_type)} · {dealSideLabel(rfp.deal_side)}
            </p>
          </div>
          <Badge tone={RFP_STATUS[status].tone}>{RFP_STATUS[status].label}</Badge>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-3">
          {rfp.brief ? (
            <p className="leading-relaxed text-slate-600">{rfp.brief}</p>
          ) : null}
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
        </CardBody>
      </Card>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {alreadyResponded ? (
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Your response
              </h2>
              <Badge tone={RFP_PROPOSAL_STATUS[mine!.status].tone}>
                {RFP_PROPOSAL_STATUS[mine!.status].label}
              </Badge>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {mine!.price_offer != null ? (
                <Fact
                  label="Price offer"
                  value={formatPriceBand(mine!.price_offer, null) ?? "—"}
                />
              ) : null}
              {mine!.units != null ? (
                <Fact label="Units" value={String(mine!.units)} />
              ) : null}
              {mine!.conditions ? (
                <Fact label="Conditions" value={mine!.conditions} full />
              ) : null}
              {mine!.narrative ? (
                <Fact label="Pitch" value={mine!.narrative} full />
              ) : null}
            </dl>
            {mine!.admin_notes ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Admin: {mine!.admin_notes}
              </p>
            ) : null}
            <p className="text-xs text-slate-400">
              Manage this from{" "}
              <Link
                href="/dashboard/deal-desk"
                className="text-brand-700 hover:underline"
              >
                Deal Desk
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      ) : canRespond ? (
        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Submit a response
            </h2>
            <form action={submitRfpProposal} className="space-y-4">
              <input type="hidden" name="rfp_id" value={rfp.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Price offer ($)" htmlFor="price_offer">
                  <Input
                    id="price_offer"
                    name="price_offer"
                    type="number"
                    min="0"
                    step="1000"
                  />
                </Field>
                <Field label="Units" htmlFor="units">
                  <Input id="units" name="units" type="number" min="0" />
                </Field>
              </div>
              <Field
                label="Conditions"
                htmlFor="conditions"
                hint="Anything your offer is contingent on (financing, timeline, deposit structure)."
              >
                <Textarea id="conditions" name="conditions" />
              </Field>
              <Field
                label="Your pitch"
                htmlFor="narrative"
                hint="Why you’re the right partner for this deal."
              >
                <Textarea id="narrative" name="narrative" />
              </Field>
              <SubmitButton pendingLabel="Submitting…">
                Submit response
              </SubmitButton>
            </form>
          </CardBody>
        </Card>
      ) : (
        <Notice tone="info">
          This deal request is no longer accepting responses.
        </Notice>
      )}
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
