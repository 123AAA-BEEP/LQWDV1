import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import {
  RENTAL_REFERRAL_STATUS,
  type RentalReferralStatus,
} from "@/lib/status";
import { setReferralStatus } from "./actions";

export const metadata: Metadata = { title: "Rental referrals" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
  status: RentalReferralStatus;
  developer_response_notes: string | null;
  created_at: string;
  agent: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  project: { project_name: string | null } | null;
}

const OPEN = ["new", "received", "in_progress"];
const DECIDED = [
  "client_not_submitting",
  "client_ineligible",
  "accepted",
  "declined",
  "withdrawn",
];
const STATUS_OPTIONS = Object.keys(
  RENTAL_REFERRAL_STATUS,
) as RentalReferralStatus[];

function personName(
  p: { first_name: string | null; last_name: string | null; email: string | null } | null,
): string {
  return (
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
    p?.email ||
    "unknown"
  );
}

export default async function ReferralsQueue() {
  const supabase = await createClient();
  const select =
    "id, client_first_name, client_last_name, client_email, client_phone, message, status, developer_response_notes, created_at, agent:profiles!referred_by_profile_id(first_name,last_name,email), project:projects!project_id(project_name)";

  const [{ data: open }, { data: decided }] = await Promise.all([
    supabase
      .from("rental_referrals")
      .select(select)
      .in("status", OPEN)
      .order("created_at", { ascending: true }),
    supabase
      .from("rental_referrals")
      .select(select)
      .in("status", DECIDED)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const openRows = (open as unknown as Row[]) ?? [];
  const decidedRows = (decided as unknown as Row[]) ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Open referrals ({openRows.length})
        </h2>
        {openRows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No open rental referrals right now.
            </CardBody>
          </Card>
        ) : (
          openRows.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {[r.client_first_name, r.client_last_name]
                        .filter(Boolean)
                        .join(" ") || "Client"}
                      <span className="font-normal text-slate-400">
                        {" "}
                        → {r.project?.project_name ?? "Project"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Referred by {personName(r.agent)} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  <Badge tone={RENTAL_REFERRAL_STATUS[r.status].tone}>
                    {RENTAL_REFERRAL_STATUS[r.status].label}
                  </Badge>
                </div>

                <p className="text-sm text-slate-600">
                  {[r.client_email, r.client_phone].filter(Boolean).join(" · ") ||
                    "No contact provided"}
                </p>
                {r.message ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {r.message}
                  </p>
                ) : null}

                <form
                  action={setReferralStatus}
                  className="space-y-3 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="referral_id" value={r.id} />
                  <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
                    <Field label="Status" htmlFor={`status-${r.id}`}>
                      <Select
                        id={`status-${r.id}`}
                        name="status"
                        defaultValue={r.status}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {RENTAL_REFERRAL_STATUS[s].label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      label="Note (internal)"
                      htmlFor={`notes-${r.id}`}
                    >
                      <Textarea
                        id={`notes-${r.id}`}
                        name="developer_response_notes"
                        defaultValue={r.developer_response_notes ?? ""}
                      />
                    </Field>
                  </div>
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                </form>
              </CardBody>
            </Card>
          ))
        )}
      </section>

      {decidedRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recently decided
          </h2>
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {decidedRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {[r.client_first_name, r.client_last_name]
                        .filter(Boolean)
                        .join(" ") || "Client"}
                      <span className="font-normal text-slate-400">
                        {" "}
                        → {r.project?.project_name ?? "Project"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {personName(r.agent)}
                    </p>
                  </div>
                  <Badge tone={RENTAL_REFERRAL_STATUS[r.status].tone}>
                    {RENTAL_REFERRAL_STATUS[r.status].label}
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
