import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import {
  OPPORTUNITY_STATUS,
  DEAL_TYPE_LABELS,
  formatMoney,
  formatCommission,
} from "@/lib/opportunities";
import type { OpportunityStatus, DealType } from "@/lib/opportunities";

export const metadata: Metadata = { title: "Developer console" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  title: string;
  deal_type: DealType;
  city: string | null;
  status: OpportunityStatus;
  asking_price: number | null;
  commission_percent: number | null;
  unit_count: number | null;
  created_at: string;
  bids: { count: number }[];
}

const MESSAGES: Record<string, string> = {
  deleted: "Opportunity deleted.",
};

export default async function DeveloperConsole({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("opportunities")
    .select(
      "id, title, deal_type, city, status, asking_price, commission_percent, unit_count, created_at, bids:opportunity_bids(count)",
    )
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Developer console
          </h1>
          <p className="mt-1 text-slate-500">
            List secret deals, control exactly what realtors can see, and field
            bids on your commissions, incentives, and price.
          </p>
        </div>
        <ButtonLink href="/dashboard/developer/new" size="sm">
          New opportunity
        </ButtonLink>
      </div>

      {message && MESSAGES[message] ? (
        <Notice tone="success">{MESSAGES[message]}</Notice>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            You haven’t listed any opportunities yet.{" "}
            <Link
              href="/dashboard/developer/new"
              className="text-brand-700 hover:underline"
            >
              Create your first deal →
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const bidCount = r.bids?.[0]?.count ?? 0;
            return (
              <Card key={r.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/developer/${r.id}`}
                      className="font-medium text-slate-800 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {[
                        DEAL_TYPE_LABELS[r.deal_type],
                        r.city,
                        r.unit_count ? `${r.unit_count} unit(s)` : null,
                        formatMoney(r.asking_price),
                        formatCommission(r.commission_percent)
                          ? `${formatCommission(r.commission_percent)} comm.`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {bidCount > 0 ? (
                      <span className="text-xs font-medium text-slate-500">
                        {bidCount} bid{bidCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    <Badge tone={OPPORTUNITY_STATUS[r.status].tone}>
                      {OPPORTUNITY_STATUS[r.status].label}
                    </Badge>
                    <ButtonLink
                      href={`/dashboard/developer/${r.id}`}
                      size="sm"
                      variant="secondary"
                    >
                      Manage
                    </ButtonLink>
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
