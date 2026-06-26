import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { VERIFICATION_LABELS, type VerificationStatus } from "@/lib/types";
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
  verification_status: VerificationStatus;
}

export default async function RealtorsAdminPage() {
  const supabase = await createClient();
  // Every realtor account — approved first, then newest — so an admin can open
  // any agent and review their full intake (contact, RECO #, status, etc.).
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, brokerage_name, realtor_tier, verification_status",
    )
    .eq("role", "realtor")
    .order("verification_status", { ascending: true })
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Realtors ({rows.length})
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Click an agent to view their full profile (contact, RECO #, status).
          Promote vetted agents to <span className="font-medium">Ultra</span> to
          grant Deal Desk access (RFP invitations &amp; responses).
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No realtors yet.
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
              const isApproved = r.verification_status === "approved";
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                >
                  <Link
                    href={`/dashboard/admin/realtors/${r.id}`}
                    className="group min-w-0 flex-1"
                  >
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-800 group-hover:text-brand-700">
                      {name}
                      <span aria-hidden className="text-slate-300 group-hover:text-brand-500">
                        ›
                      </span>
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {[r.brokerage_name, r.email].filter(Boolean).join(" · ")}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge tone={verificationBadgeTone(r.verification_status)}>
                      {VERIFICATION_LABELS[r.verification_status]}
                    </Badge>
                    {isApproved ? (
                      <>
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
                      </>
                    ) : null}
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
