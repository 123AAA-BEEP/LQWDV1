import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import {
  DEAL_TYPE_LABELS,
  formatMoney,
  formatCommission,
  isHidden,
} from "@/lib/opportunities";
import type { DealType } from "@/lib/opportunities";
import type { OpportunityMarketRow } from "@/lib/types";

export const metadata: Metadata = { title: "Opportunities" };
export const dynamic = "force-dynamic";

function maskedOr(
  value: string | null,
  hiddenFields: string[],
  key: "address" | "city" | "price" | "commission" | "incentive" | "unit_count",
): string {
  if (value) return value;
  return isHidden(hiddenFields, key) ? "Hidden by developer" : "—";
}

export default async function OpportunitiesPage() {
  const { profile } = await requireUserProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("opportunities_market_view")
    .select("*")
    .order("published_at", { ascending: false });

  const rows = (data as unknown as OpportunityMarketRow[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Opportunities
        </h1>
        <p className="mt-1 text-slate-500">
          Live deals listed by developers. Bid their commission, incentive, or
          price up or down to win the deal.
        </p>
      </div>

      {!isApproved(profile) ? (
        <Notice tone="warning">
          Get verified to view and bid on developer opportunities.{" "}
          <Link href="/dashboard/verify" className="font-medium underline">
            Start verification →
          </Link>
        </Notice>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No open opportunities right now. Check back soon.
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const hf = r.hidden_fields ?? [];
            return (
              <Card key={r.id} className="transition-shadow hover:shadow-md">
                <CardBody className="flex h-full flex-col space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/opportunities/${r.id}`}
                      className="font-semibold text-ink hover:underline"
                    >
                      {r.title}
                    </Link>
                    <Badge tone="brand">
                      {DEAL_TYPE_LABELS[r.deal_type as DealType] ?? r.deal_type}
                    </Badge>
                  </div>
                  {r.summary ? (
                    <p className="line-clamp-3 flex-1 text-sm text-slate-600">
                      {r.summary}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Term
                      label="Location"
                      value={maskedOr(r.city, hf, "city")}
                    />
                    <Term
                      label="Units"
                      value={
                        r.unit_count != null
                          ? String(r.unit_count)
                          : maskedOr(null, hf, "unit_count")
                      }
                    />
                    <Term
                      label="Price"
                      value={
                        formatMoney(r.asking_price) ??
                        maskedOr(null, hf, "price")
                      }
                    />
                    <Term
                      label="Commission"
                      value={
                        formatCommission(r.commission_percent) ??
                        maskedOr(null, hf, "commission")
                      }
                    />
                  </dl>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                    <span>
                      {r.developer_name ?? "Developer (private)"}
                    </span>
                    <span>
                      {r.bid_count} bid{r.bid_count === 1 ? "" : "s"}
                    </span>
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
