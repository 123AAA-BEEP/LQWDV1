import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import {
  PROPOSAL_STATUS,
  PROPOSAL_OPEN_STATUSES,
  PROPOSAL_FORMAT_LABELS,
} from "@/lib/status";
import type { ProposalStatus } from "@/lib/status";
import { formatPriceBand } from "@/lib/types";
import { decideProposal } from "./actions";

export const metadata: Metadata = { title: "Proposals" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  proposal_format: string;
  commission_ask_percent: number | null;
  price_reduction_ask: number | null;
  incentive_ask: string | null;
  consideration: string | null;
  narrative: string | null;
  valid_until: string | null;
  status: ProposalStatus;
  admin_notes: string | null;
  created_at: string;
  project_id: string;
  submitter: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  project: { project_name: string; slug: string } | null;
}

const SELECT =
  "id, proposal_format, commission_ask_percent, price_reduction_ask, incentive_ask, consideration, narrative, valid_until, status, admin_notes, created_at, project_id, submitter:profiles!submitted_by_user_id(first_name,last_name,email), project:projects!project_id(project_name,slug)";

export default async function ProposalsQueue() {
  const supabase = await createClient();

  const [{ data: open }, { data: decided }] = await Promise.all([
    supabase
      .from("project_proposals")
      .select(SELECT)
      .in("status", PROPOSAL_OPEN_STATUSES)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_proposals")
      .select(SELECT)
      .in("status", ["accepted", "declined", "countered", "withdrawn", "expired"])
      .order("reviewed_at", { ascending: false })
      .limit(10),
  ]);

  const openRows = (open as unknown as Row[]) ?? [];
  const decidedRows = (decided as unknown as Row[]) ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          To review ({openRows.length})
        </h2>
        {openRows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No proposals are waiting for review.
            </CardBody>
          </Card>
        ) : (
          openRows.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {r.project?.project_name ?? "Project"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {PROPOSAL_FORMAT_LABELS[r.proposal_format] ??
                        r.proposal_format}{" "}
                      · {new Date(r.created_at).toLocaleDateString("en-CA")}
                      {r.valid_until
                        ? ` · valid to ${new Date(r.valid_until).toLocaleDateString("en-CA")}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone={PROPOSAL_STATUS[r.status].tone}>
                    {PROPOSAL_STATUS[r.status].label}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400">
                  From{" "}
                  {[r.submitter?.first_name, r.submitter?.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                    r.submitter?.email ||
                    "unknown"}
                </p>

                <dl className="grid gap-2 sm:grid-cols-2">
                  {r.commission_ask_percent != null ? (
                    <Ask
                      label="Commission ask"
                      value={`${r.commission_ask_percent}%`}
                    />
                  ) : null}
                  {r.price_reduction_ask != null ? (
                    <Ask
                      label="Price reduction ask"
                      value={
                        formatPriceBand(r.price_reduction_ask, null)?.replace(
                          /^From /,
                          "",
                        ) ?? "—"
                      }
                    />
                  ) : null}
                  {r.incentive_ask ? (
                    <Ask label="Incentive ask" value={r.incentive_ask} full />
                  ) : null}
                  {r.consideration ? (
                    <Ask label="In exchange" value={r.consideration} full />
                  ) : null}
                  {r.narrative ? (
                    <Ask label="Context" value={r.narrative} full />
                  ) : null}
                </dl>

                {r.project_id ? (
                  <Link
                    href={`/dashboard/admin/projects/${r.project_id}`}
                    className="inline-block text-xs text-brand-700 hover:underline"
                  >
                    Open project →
                  </Link>
                ) : null}

                <form
                  action={decideProposal}
                  className="space-y-2 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="proposal_id" value={r.id} />
                  <Textarea
                    name="admin_notes"
                    placeholder="Notes to the realtor (required for a counter)…"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" name="status" value="accepted" size="sm">
                      Accept
                    </Button>
                    <Button
                      type="submit"
                      name="status"
                      value="countered"
                      size="sm"
                      variant="secondary"
                    >
                      Counter
                    </Button>
                    <Button
                      type="submit"
                      name="status"
                      value="declined"
                      size="sm"
                      variant="danger"
                    >
                      Decline
                    </Button>
                  </div>
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
                  className="flex items-center justify-between px-5 py-3"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {r.project?.project_name ?? "Project"}
                  </p>
                  <Badge tone={PROPOSAL_STATUS[r.status].tone}>
                    {PROPOSAL_STATUS[r.status].label}
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

function Ask({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}
