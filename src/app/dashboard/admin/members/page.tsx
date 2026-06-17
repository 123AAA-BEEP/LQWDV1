import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { UltraBadge } from "@/components/dashboard/ultra";
import { VERIFICATION_LABELS } from "@/lib/types";
import type { Tier, VerificationStatus } from "@/lib/types";
import { setTier } from "./actions";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  brokerage_name: string | null;
  verification_status: VerificationStatus;
  tier: Tier;
  stripe_subscription_id: string | null;
}

function fullName(r: Row): string {
  return (
    [r.first_name, r.last_name].filter(Boolean).join(" ") ||
    r.email ||
    "Unknown user"
  );
}

export default async function MembersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, brokerage_name, verification_status, tier, stripe_subscription_id",
    )
    .eq("role", "realtor")
    .order("tier", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data as Row[] | null) ?? [];
  const ultraCount = rows.filter((r) => r.tier === "ultra").length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {rows.length} realtors · {ultraCount} on Ultra. Grant or revoke Ultra by
        hand below — paid memberships are managed automatically via Stripe.
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No realtor members yet.
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="divide-y divide-slate-100 p-0">
            {rows.map((r) => {
              const isUltra = r.tier === "ultra";
              const paid = Boolean(r.stripe_subscription_id);
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      {fullName(r)}
                      {isUltra ? <UltraBadge /> : null}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {[r.email, r.brokerage_name].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={verificationBadgeTone(r.verification_status)}>
                      {VERIFICATION_LABELS[r.verification_status]}
                    </Badge>
                    <form action={setTier}>
                      <input type="hidden" name="profile_id" value={r.id} />
                      <input
                        type="hidden"
                        name="tier"
                        value={isUltra ? "free" : "ultra"}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant={isUltra ? "secondary" : "primary"}
                        title={
                          isUltra && paid
                            ? "This member has a Stripe subscription — cancel in Stripe to stop billing."
                            : undefined
                        }
                      >
                        {isUltra ? "Revoke Ultra" : "Grant Ultra"}
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
