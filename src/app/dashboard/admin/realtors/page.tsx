import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setRealtorTier } from "./actions";

export const metadata: Metadata = { title: "Realtors & tiers" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  brokerage_name: string | null;
  realtor_tier: string;
}

export default async function RealtorsAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, brokerage_name, realtor_tier")
    .eq("role", "realtor")
    .eq("verification_status", "approved")
    .order("realtor_tier", { ascending: false })
    .order("created_at", { ascending: true });

  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Approved realtors ({rows.length})
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Promote vetted agents to <span className="font-medium">Ultra</span> to
          grant Deal Desk access (RFP invitations &amp; responses).
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No approved realtors yet.
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="divide-y divide-slate-100 p-0">
            {rows.map((r) => {
              const name =
                [r.first_name, r.last_name].filter(Boolean).join(" ") ||
                r.email ||
                "Unknown";
              const isUltra = r.realtor_tier === "ultra";
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {[r.brokerage_name, r.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isUltra ? (
                      <Badge tone="brand">Ultra</Badge>
                    ) : (
                      <Badge tone="neutral">Standard</Badge>
                    )}
                    <form action={setRealtorTier}>
                      <input type="hidden" name="profile_id" value={r.id} />
                      <input
                        type="hidden"
                        name="tier"
                        value={isUltra ? "standard" : "ultra"}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant={isUltra ? "secondary" : "primary"}
                      >
                        {isUltra ? "Demote to standard" : "Promote to Ultra"}
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
