import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REWARD_REASON_LABELS } from "@/lib/types";
import type { RewardReason } from "@/lib/types";

export const metadata: Metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

type NameRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
} | null;

function name(p: NameRow): string {
  if (!p) return "unknown";
  return (
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.email ||
    "unknown"
  );
}

function date(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA");
}

interface ReferralRow {
  id: string;
  status: "pending" | "qualified" | "void";
  created_at: string;
  referrer: NameRow;
  referred: NameRow;
}

interface LedgerRow {
  id: string;
  reason: RewardReason;
  days_granted: number;
  created_at: string;
  recipient: NameRow;
}

export default async function AdminRewardsPage() {
  const supabase = await createClient();

  const [{ data: referrals }, { data: ledger }] = await Promise.all([
    supabase
      .from("referrals")
      .select(
        "id, status, created_at, referrer:profiles!referrer_profile_id(first_name,last_name,email), referred:profiles!referred_profile_id(first_name,last_name,email)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("rewards_ledger")
      .select(
        "id, reason, days_granted, created_at, recipient:profiles!profile_id(first_name,last_name,email)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const referralRows = (referrals as unknown as ReferralRow[]) ?? [];
  const ledgerRows = (ledger as unknown as LedgerRow[]) ?? [];

  const totalDays = ledgerRows.reduce((s, r) => s + (r.days_granted ?? 0), 0);
  const qualified = referralRows.filter((r) => r.status === "qualified").length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Referrals (recent)" value={String(referralRows.length)} />
        <Stat label="Verified referrals" value={String(qualified)} />
        <Stat label="Pro days granted (recent)" value={String(totalDays)} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Referrals
        </h2>
        {referralRows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No referrals yet.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {referralRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="text-sm">
                    <p className="font-medium text-slate-800">
                      {name(r.referrer)}{" "}
                      <span className="font-normal text-slate-400">
                        invited
                      </span>{" "}
                      {name(r.referred)}
                    </p>
                    <p className="text-xs text-slate-400">{date(r.created_at)}</p>
                  </div>
                  <Badge tone={r.status === "qualified" ? "success" : "warning"}>
                    {r.status === "qualified" ? "Verified" : "Signed up"}
                  </Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Reward ledger
        </h2>
        {ledgerRows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No rewards granted yet.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {ledgerRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="text-sm">
                    <p className="font-medium text-slate-800">
                      {name(r.recipient)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {REWARD_REASON_LABELS[r.reason]} · {date(r.created_at)}
                    </p>
                  </div>
                  <Badge tone="brand">+{r.days_granted} days</Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-2xl font-semibold text-ink">{value}</p>
        <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      </CardBody>
    </Card>
  );
}
