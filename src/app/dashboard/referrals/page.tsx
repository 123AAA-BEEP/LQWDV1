import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUserProfile, isDeveloper } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import {
  RENTAL_REFERRAL_STATUS,
  type RentalReferralStatus,
} from "@/lib/status";
import { setDeveloperReferralStatus } from "./actions";

export const metadata: Metadata = { title: "Rental referrals" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  project_name: string | null;
  city: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
  status: RentalReferralStatus;
  developer_response_notes: string | null;
  created_at: string;
  service_mode: string | null;
}

const OPEN = ["new", "received", "in_progress"];
// Statuses a developer can choose (excludes 'withdrawn'; 'new' shown for context).
const STATUS_OPTIONS: RentalReferralStatus[] = [
  "new",
  "received",
  "in_progress",
  "client_not_submitting",
  "client_ineligible",
  "accepted",
  "declined",
];

function clientName(r: Row): string {
  return (
    [r.client_first_name, r.client_last_name].filter(Boolean).join(" ") ||
    "Client"
  );
}

export default async function DeveloperReferrals() {
  const { profile } = await requireUserProfile();
  if (!isDeveloper(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("developer_referrals_view")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data as Row[] | null) ?? [];
  const open = rows.filter((r) => OPEN.includes(r.status));
  const decided = rows.filter((r) => !OPEN.includes(r.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Rental referrals
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Agents refer renters to your buildings. Reach out, then update the
          status so the agent sees progress. Accepting one is the agent&rsquo;s
          cue to invoice the referral fee.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No open referrals right now. When an agent refers a renter to one
              of your buildings, it&rsquo;ll appear here.
            </CardBody>
          </Card>
        ) : (
          open.map((r) => {
            const selfServe = r.service_mode === "self_serve";
            return (
              <Card key={r.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">
                        {clientName(r)}
                        <span className="font-normal text-slate-400">
                          {" "}
                          → {r.project_name ?? "Your project"}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleDateString("en-CA")}
                        {r.city ? ` · ${r.city}` : ""}
                      </p>
                    </div>
                    <Badge tone={RENTAL_REFERRAL_STATUS[r.status].tone}>
                      {RENTAL_REFERRAL_STATUS[r.status].label}
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-600">
                    {[r.client_email, r.client_phone]
                      .filter(Boolean)
                      .join(" · ") || "No contact provided"}
                  </p>
                  {r.message ? (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      {r.message}
                    </p>
                  ) : null}

                  {selfServe ? (
                    <form
                      action={setDeveloperReferralStatus}
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
                        <Field label="Note (internal)" htmlFor={`notes-${r.id}`}>
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
                  ) : (
                    <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
                      Managed by the LIQWD team — they&rsquo;ll update the status.
                    </p>
                  )}
                </CardBody>
              </Card>
            );
          })
        )}
      </section>

      {decided.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recently decided
          </h2>
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {decided.slice(0, 15).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {clientName(r)}
                      <span className="font-normal text-slate-400">
                        {" "}
                        → {r.project_name ?? "Your project"}
                      </span>
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
