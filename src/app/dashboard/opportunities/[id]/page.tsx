import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  DEAL_TYPE_LABELS,
  UNIT_STATUS,
  BID_STATUS,
  formatMoney,
  formatCommission,
  isHidden,
} from "@/lib/opportunities";
import type { DealType, UnitStatus, BidStatus } from "@/lib/opportunities";
import type { OpportunityMarketRow, OpportunityBid } from "@/lib/types";
import { placeBid, withdrawBid } from "../actions";

export const metadata: Metadata = { title: "Opportunity" };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  bid: "Your bid was sent to the developer.",
  withdrawn: "Bid withdrawn.",
};

interface UnitRow {
  id: string;
  label: string;
  unit_type: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: UnitStatus;
  asking_price: number | null;
  address_full: string | null;
}

export default async function OpportunityDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { id } = await params;
  const { message, error } = await searchParams;
  const { userId, profile } = await requireUserProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("opportunities_market_view")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const opp = data as unknown as OpportunityMarketRow;
  const hf = opp.hidden_fields ?? [];

  const [{ data: unitData }, { data: bidData }] = await Promise.all([
    supabase
      .from("opportunity_units_market_view")
      .select("*")
      .eq("opportunity_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("opportunity_bids")
      .select(
        "id, opportunity_id, realtor_id, bid_commission_percent, bid_incentive_amount, bid_price, message, status, developer_response, responded_at, created_at, updated_at",
      )
      .eq("opportunity_id", id)
      .eq("realtor_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const units = (unitData as unknown as UnitRow[]) ?? [];
  const myBids = (bidData as unknown as OpportunityBid[]) ?? [];
  const hasOpenBid = myBids.some((b) => b.status === "open");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/opportunities"
          className="text-sm text-brand-700 hover:underline"
        >
          ← All opportunities
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {opp.title}
          </h1>
          <Badge tone="brand">
            {DEAL_TYPE_LABELS[opp.deal_type as DealType] ?? opp.deal_type}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Listed by {opp.developer_name ?? "a developer (identity private)"}
        </p>
      </div>

      {message && MESSAGES[message] ? (
        <Notice tone="success">{MESSAGES[message]}</Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        <CardBody className="space-y-4">
          {opp.summary ? (
            <p className="text-sm text-slate-600">{opp.summary}</p>
          ) : null}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Term label="Location" value={fieldValue(opp.city, hf, "city")} />
            <Term
              label="Units / properties"
              value={
                opp.unit_count != null
                  ? String(opp.unit_count)
                  : fieldValue(null, hf, "unit_count")
              }
            />
            <Term
              label="Address"
              value={fieldValue(opp.address_full, hf, "address")}
            />
            <Term
              label="Asking price"
              value={
                formatMoney(opp.asking_price) ?? fieldValue(null, hf, "price")
              }
            />
            <Term
              label="Commission"
              value={
                formatCommission(opp.commission_percent) ??
                fieldValue(null, hf, "commission")
              }
            />
            <Term
              label="Incentive"
              value={
                formatMoney(opp.incentive_amount) ??
                fieldValue(null, hf, "incentive")
              }
            />
          </dl>
          {opp.incentive_notes ? (
            <p className="text-sm text-slate-600">{opp.incentive_notes}</p>
          ) : null}
        </CardBody>
      </Card>

      {units.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Properties / units
          </h2>
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {u.label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[
                        u.unit_type,
                        u.beds ? `${u.beds} bd` : null,
                        u.baths ? `${u.baths} ba` : null,
                        u.sqft ? `${u.sqft} sqft` : null,
                        formatMoney(u.asking_price) ??
                          (isHidden(hf, "price") ? "Price hidden" : null),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <Badge tone={UNIT_STATUS[u.status].tone}>
                    {UNIT_STATUS[u.status].label}
                  </Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </section>
      ) : null}

      {/* My bids */}
      {myBids.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your bids
          </h2>
          {myBids.map((b) => (
            <Card key={b.id}>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <Term
                      label="Commission"
                      value={formatCommission(b.bid_commission_percent) ?? "—"}
                    />
                    <Term
                      label="Incentive"
                      value={formatMoney(b.bid_incentive_amount) ?? "—"}
                    />
                    <Term
                      label="Price"
                      value={formatMoney(b.bid_price) ?? "—"}
                    />
                  </div>
                  <Badge tone={BID_STATUS[b.status as BidStatus].tone}>
                    {BID_STATUS[b.status as BidStatus].label}
                  </Badge>
                </div>
                {b.developer_response ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Developer: {b.developer_response}
                  </p>
                ) : null}
                {b.status === "open" ? (
                  <form action={withdrawBid}>
                    <input type="hidden" name="opportunity_id" value={id} />
                    <input type="hidden" name="bid_id" value={b.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Withdraw bid
                    </Button>
                  </form>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </section>
      ) : null}

      {/* Place a bid */}
      {!isApproved(profile) ? (
        <Notice tone="warning">
          Get verified to place a bid on this opportunity.
        </Notice>
      ) : hasOpenBid ? (
        <Notice tone="info">
          You have an open bid on this opportunity. Withdraw it above to submit a
          new one.
        </Notice>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Place a bid
          </h2>
          <Card>
            <CardBody>
              <form action={placeBid} className="space-y-4">
                <input type="hidden" name="opportunity_id" value={id} />
                <p className="text-sm text-slate-500">
                  Propose your terms. Leave a field blank to accept the
                  developer’s listed value.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Commission (%)" htmlFor="bid_commission_percent">
                    <Input
                      id="bid_commission_percent"
                      name="bid_commission_percent"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </Field>
                  <Field label="Incentive ($)" htmlFor="bid_incentive_amount">
                    <Input
                      id="bid_incentive_amount"
                      name="bid_incentive_amount"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </Field>
                  <Field label="Price ($)" htmlFor="bid_price">
                    <Input
                      id="bid_price"
                      name="bid_price"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </Field>
                </div>
                <Field label="Message" htmlFor="message">
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Add context for the developer…"
                  />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit">Submit bid</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </section>
      )}
    </div>
  );
}

function fieldValue(
  value: string | null,
  hiddenFields: string[],
  key: "address" | "city" | "price" | "commission" | "incentive" | "unit_count",
): string {
  if (value) return value;
  return isHidden(hiddenFields, key) ? "Hidden by developer" : "—";
}

function Term({ label, value }: { label: string; value: string }) {
  const masked = value === "Hidden by developer";
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd
        className={masked ? "italic text-slate-400" : "font-medium text-slate-800"}
      >
        {value}
      </dd>
    </div>
  );
}
