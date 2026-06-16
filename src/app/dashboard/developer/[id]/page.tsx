import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import {
  OPPORTUNITY_STATUS,
  UNIT_STATUS,
  BID_STATUS,
  formatMoney,
  formatCommission,
} from "@/lib/opportunities";
import type {
  OpportunityStatus,
  UnitStatus,
  BidStatus,
} from "@/lib/opportunities";
import type { Opportunity, OpportunityUnit } from "@/lib/types";
import { OpportunityFields } from "../opportunity-form";
import {
  updateOpportunity,
  setOpportunityStatus,
  deleteOpportunity,
  addUnit,
  deleteUnit,
  respondToBid,
} from "../actions";

export const metadata: Metadata = { title: "Manage opportunity" };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  created: "Draft created. Add units and publish when you’re ready.",
  saved: "Changes saved.",
  status: "Status updated.",
  unit_added: "Unit added.",
  unit_removed: "Unit removed.",
  responded: "Your response was sent to the realtor.",
};

interface BidRow {
  id: string;
  realtor_id: string;
  bid_commission_percent: number | null;
  bid_incentive_amount: number | null;
  bid_price: number | null;
  message: string | null;
  status: BidStatus;
  developer_response: string | null;
  created_at: string;
  realtor: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export default async function ManageOpportunity({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { id } = await params;
  const { message, error } = await searchParams;
  const supabase = await createClient();

  const { data: opp } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!opp) notFound();
  const opportunity = opp as Opportunity;
  const status = opportunity.status as OpportunityStatus;

  const [{ data: unitData }, { data: bidData }] = await Promise.all([
    supabase
      .from("opportunity_units")
      .select("*")
      .eq("opportunity_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("opportunity_bids")
      .select(
        "id, realtor_id, bid_commission_percent, bid_incentive_amount, bid_price, message, status, developer_response, created_at, realtor:profiles!realtor_id(first_name,last_name,email)",
      )
      .eq("opportunity_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const units = (unitData as unknown as OpportunityUnit[]) ?? [];
  const bids = (bidData as unknown as BidRow[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/developer"
          className="text-sm text-brand-700 hover:underline"
        >
          ← Developer console
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {opportunity.title}
          </h1>
          <Badge tone={OPPORTUNITY_STATUS[status].tone}>
            {OPPORTUNITY_STATUS[status].label}
          </Badge>
        </div>
      </div>

      {message && MESSAGES[message] ? (
        <Notice tone="success">{MESSAGES[message]}</Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {status === "suspended" ? (
        <Notice tone="warning">
          This opportunity was suspended by a LIQWD admin and is hidden from the
          marketplace. {opportunity.admin_notes ? `Note: ${opportunity.admin_notes}` : null}
        </Notice>
      ) : null}

      {/* Status controls */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-medium text-slate-600">
            Listing status:
          </span>
          {status !== "open" && status !== "suspended" ? (
            <form action={setOpportunityStatus}>
              <input type="hidden" name="opportunity_id" value={id} />
              <input type="hidden" name="status" value="open" />
              <Button type="submit" size="sm">
                {opportunity.published_at ? "Reopen" : "Publish to marketplace"}
              </Button>
            </form>
          ) : null}
          {status === "open" ? (
            <>
              <form action={setOpportunityStatus}>
                <input type="hidden" name="opportunity_id" value={id} />
                <input type="hidden" name="status" value="paused" />
                <Button type="submit" size="sm" variant="secondary">
                  Pause
                </Button>
              </form>
              <form action={setOpportunityStatus}>
                <input type="hidden" name="opportunity_id" value={id} />
                <input type="hidden" name="status" value="closed" />
                <Button type="submit" size="sm" variant="secondary">
                  Close
                </Button>
              </form>
            </>
          ) : null}
          {status === "draft" ? (
            <form
              action={deleteOpportunity}
              className="ml-auto"
            >
              <input type="hidden" name="opportunity_id" value={id} />
              <Button type="submit" size="sm" variant="danger">
                Delete draft
              </Button>
            </form>
          ) : null}
        </CardBody>
      </Card>

      {/* Bids */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bids ({bids.length})
        </h2>
        {bids.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No bids yet. Realtors can bid your commission, incentive, or price
              up or down once this is open.
            </CardBody>
          </Card>
        ) : (
          bids.map((b) => {
            const realtorName =
              [b.realtor?.first_name, b.realtor?.last_name]
                .filter(Boolean)
                .join(" ") ||
              b.realtor?.email ||
              "Realtor";
            return (
              <Card key={b.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{realtorName}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(b.created_at).toLocaleDateString("en-CA")}
                      </p>
                    </div>
                    <Badge tone={BID_STATUS[b.status].tone}>
                      {BID_STATUS[b.status].label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <BidTerm
                      label="Commission"
                      value={formatCommission(b.bid_commission_percent)}
                    />
                    <BidTerm
                      label="Incentive"
                      value={formatMoney(b.bid_incentive_amount)}
                    />
                    <BidTerm label="Price" value={formatMoney(b.bid_price)} />
                  </div>
                  {b.message ? (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      {b.message}
                    </p>
                  ) : null}
                  {b.developer_response ? (
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      Your response: {b.developer_response}
                    </p>
                  ) : null}

                  {b.status === "open" ? (
                    <form
                      action={respondToBid}
                      className="space-y-2 border-t border-slate-100 pt-3"
                    >
                      <input type="hidden" name="opportunity_id" value={id} />
                      <input type="hidden" name="bid_id" value={b.id} />
                      <Textarea
                        name="developer_response"
                        placeholder="Optional message to the realtor…"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="submit"
                          name="decision"
                          value="accepted"
                          size="sm"
                        >
                          Accept
                        </Button>
                        <Button
                          type="submit"
                          name="decision"
                          value="countered"
                          size="sm"
                          variant="secondary"
                        >
                          Counter
                        </Button>
                        <Button
                          type="submit"
                          name="decision"
                          value="declined"
                          size="sm"
                          variant="danger"
                        >
                          Decline
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </CardBody>
              </Card>
            );
          })
        )}
      </section>

      {/* Units */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Properties / units ({units.length})
        </h2>
        {units.length > 0 ? (
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {u.label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[
                        u.unit_type,
                        u.beds ? `${u.beds} bd` : null,
                        u.baths ? `${u.baths} ba` : null,
                        u.sqft ? `${u.sqft} sqft` : null,
                        formatMoney(u.asking_price),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={UNIT_STATUS[u.status as UnitStatus].tone}>
                      {UNIT_STATUS[u.status as UnitStatus].label}
                    </Badge>
                    <form action={deleteUnit}>
                      <input type="hidden" name="opportunity_id" value={id} />
                      <input type="hidden" name="unit_id" value={u.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardBody>
            <form action={addUnit} className="space-y-4">
              <input type="hidden" name="opportunity_id" value={id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Label" htmlFor="label">
                  <Input id="label" name="label" required placeholder="Unit 510" />
                </Field>
                <Field label="Unit type" htmlFor="unit_type">
                  <Input id="unit_type" name="unit_type" placeholder="2-bed condo" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Beds" htmlFor="beds">
                  <Input id="beds" name="beds" type="number" step="0.5" min="0" />
                </Field>
                <Field label="Baths" htmlFor="baths">
                  <Input id="baths" name="baths" type="number" step="0.5" min="0" />
                </Field>
                <Field label="Sqft" htmlFor="sqft">
                  <Input id="sqft" name="sqft" type="number" min="0" />
                </Field>
                <Field label="Asking price" htmlFor="unit_asking_price">
                  <Input
                    id="unit_asking_price"
                    name="asking_price"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Address (hidden per deal settings)" htmlFor="unit_address">
                  <Input id="unit_address" name="address_full" />
                </Field>
                <Field label="Status" htmlFor="unit_status">
                  <Select id="unit_status" name="status" defaultValue="available">
                    {(Object.keys(UNIT_STATUS) as UnitStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {UNIT_STATUS[s].label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button type="submit" size="sm" variant="secondary">
                  Add unit
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>

      {/* Edit terms + privacy */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Deal terms &amp; privacy
        </h2>
        <Card>
          <CardBody>
            <form action={updateOpportunity} className="space-y-6">
              <input type="hidden" name="opportunity_id" value={id} />
              <OpportunityFields value={opportunity} />
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function BidTerm({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <p className="font-medium text-slate-800">{value ?? "—"}</p>
    </div>
  );
}
