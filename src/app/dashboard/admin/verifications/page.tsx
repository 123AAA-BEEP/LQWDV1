import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { VERIFICATION_LABELS } from "@/lib/types";
import type { VerificationStatus } from "@/lib/types";
import { decideVerification } from "./actions";

export const metadata: Metadata = { title: "Verification queue" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  profile_id: string;
  status: VerificationStatus;
  reco_registration_number: string;
  brokerage_name_submitted: string | null;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  requester: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

function fullName(r: Row): string {
  const name = [r.requester?.first_name, r.requester?.last_name]
    .filter(Boolean)
    .join(" ");
  return name || r.requester?.email || "Unknown user";
}

export default async function VerificationsQueue() {
  const supabase = await createClient();
  const select =
    "id, profile_id, status, reco_registration_number, brokerage_name_submitted, notes, created_at, reviewed_at, requester:profiles!profile_id(first_name,last_name,email)";

  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase
      .from("verification_requests")
      .select(select)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("verification_requests")
      .select(select)
      .neq("status", "pending")
      .order("reviewed_at", { ascending: false })
      .limit(10),
  ]);

  const pendingRows = (pending as unknown as Row[]) ?? [];
  const recentRows = (recent as unknown as Row[]) ?? [];

  // Also surface users who signed up + confirmed email (profile = pending) but
  // haven't submitted the RECO form yet, so an admin can verify them directly.
  const { data: pendingProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, created_at")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  const submittedIds = new Set(pendingRows.map((r) => r.profile_id));
  const unsubmitted = ((pendingProfiles ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    created_at: string;
  }[]).filter((p) => !submittedIds.has(p.id));

  const totalPending = pendingRows.length + unsubmitted.length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Pending ({totalPending})
        </h2>
        {totalPending === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No users are waiting for verification.
            </CardBody>
          </Card>
        ) : (
          <>
            {pendingRows.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{fullName(r)}</p>
                    <p className="text-xs text-slate-400">
                      {r.requester?.email}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleDateString("en-CA")}
                  </span>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-slate-400">
                      RECO #
                    </dt>
                    <dd className="text-slate-800">
                      {r.reco_registration_number}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">
                      Brokerage
                    </dt>
                    <dd className="text-slate-800">
                      {r.brokerage_name_submitted ?? "—"}
                    </dd>
                  </div>
                  {r.notes ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs uppercase text-slate-400">
                        Notes
                      </dt>
                      <dd className="text-slate-700">{r.notes}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="flex flex-wrap gap-2">
                  <DecisionButton
                    requestId={r.id}
                    profileId={r.profile_id}
                    decision="approved"
                    label="Approve"
                    variant="primary"
                  />
                  <DecisionButton
                    requestId={r.id}
                    profileId={r.profile_id}
                    decision="rejected"
                    label="Reject"
                    variant="secondary"
                  />
                  <DecisionButton
                    requestId={r.id}
                    profileId={r.profile_id}
                    decision="suspended"
                    label="Suspend"
                    variant="danger"
                  />
                </div>
              </CardBody>
            </Card>
            ))}
            {unsubmitted.map((u) => (
              <Card key={u.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">
                        {[u.first_name, u.last_name].filter(Boolean).join(" ") ||
                          u.email ||
                          "Unknown user"}
                      </p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(u.created_at).toLocaleDateString("en-CA")}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600">
                    Signed up — RECO form not submitted yet.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <DecisionButton
                      profileId={u.id}
                      decision="approved"
                      label="Approve"
                      variant="primary"
                    />
                    <DecisionButton
                      profileId={u.id}
                      decision="rejected"
                      label="Reject"
                      variant="secondary"
                    />
                    <DecisionButton
                      profileId={u.id}
                      decision="suspended"
                      label="Suspend"
                      variant="danger"
                    />
                  </div>
                </CardBody>
              </Card>
            ))}
          </>
        )}
      </section>

      {recentRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recently decided
          </h2>
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {recentRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {fullName(r)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.reco_registration_number}
                    </p>
                  </div>
                  <Badge tone={verificationBadgeTone(r.status)}>
                    {VERIFICATION_LABELS[r.status]}
                  </Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function DecisionButton({
  requestId,
  profileId,
  decision,
  label,
  variant,
}: {
  requestId?: string;
  profileId: string;
  decision: string;
  label: string;
  variant: "primary" | "secondary" | "danger";
}) {
  return (
    <form action={decideVerification}>
      {requestId ? (
        <input type="hidden" name="request_id" value={requestId} />
      ) : null}
      <input type="hidden" name="profile_id" value={profileId} />
      <input type="hidden" name="decision" value={decision} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}
