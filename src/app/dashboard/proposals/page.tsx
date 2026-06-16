import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { PROPOSAL_STATUS, PROPOSAL_FORMAT_LABELS } from "@/lib/status";
import type { ProposalStatus } from "@/lib/status";
import { formatPriceBand } from "@/lib/types";
import { withdrawProposal } from "./actions";

export const metadata: Metadata = { title: "My proposals" };
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
  project: { project_name: string; slug: string } | null;
}

export default async function MyProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const { userId } = await requireUserProfile();

  const supabase = await createClient();
  const { data } = await supabase
    .from("project_proposals")
    .select(
      "id, proposal_format, commission_ask_percent, price_reduction_ask, incentive_ask, consideration, narrative, valid_until, status, admin_notes, created_at, project:projects!project_id(project_name,slug)",
    )
    .eq("submitted_by_user_id", userId)
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          My proposals
        </h1>
        <p className="mt-1 text-slate-500">
          Counter-offers you’ve sent and where each one stands.
        </p>
      </div>

      {message === "submitted" ? (
        <Notice tone="success">
          Your proposal was submitted. We’ll review it shortly.
        </Notice>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            You haven’t submitted any proposals yet. Open a project and choose{" "}
            <Link
              href="/dashboard/projects"
              className="text-brand-700 hover:underline"
            >
              “Submit a proposal”
            </Link>
            .
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const canWithdraw =
              r.status === "submitted" || r.status === "countered";
            return (
              <Card key={r.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {r.project ? (
                          <Link
                            href={`/dashboard/projects/${r.project.slug}`}
                            className="hover:underline"
                          >
                            {r.project.project_name}
                          </Link>
                        ) : (
                          "Project"
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {PROPOSAL_FORMAT_LABELS[r.proposal_format] ??
                          r.proposal_format}{" "}
                        · {new Date(r.created_at).toLocaleDateString("en-CA")}
                      </p>
                    </div>
                    <Badge tone={PROPOSAL_STATUS[r.status].tone}>
                      {PROPOSAL_STATUS[r.status].label}
                    </Badge>
                  </div>

                  <ProposalAsks row={r} />

                  {r.consideration ? (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">
                        In exchange:
                      </span>{" "}
                      {r.consideration}
                    </p>
                  ) : null}

                  {r.admin_notes ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Admin: {r.admin_notes}
                    </p>
                  ) : null}

                  {canWithdraw ? (
                    <form action={withdrawProposal} className="pt-1">
                      <input type="hidden" name="proposal_id" value={r.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Withdraw
                      </Button>
                    </form>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Compact summary of the structured asks (or the freeform narrative). */
function ProposalAsks({ row }: { row: Row }) {
  const asks: string[] = [];
  if (row.commission_ask_percent != null)
    asks.push(`Commission ${row.commission_ask_percent}%`);
  if (row.price_reduction_ask != null)
    asks.push(
      `Price −${formatPriceBand(row.price_reduction_ask, null)?.replace(/^From /, "")}`,
    );
  if (row.incentive_ask) asks.push(`Incentives: ${row.incentive_ask}`);

  if (asks.length === 0 && row.narrative) {
    return <p className="text-sm text-slate-600">{row.narrative}</p>;
  }
  if (asks.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {asks.map((a) => (
        <li
          key={a}
          className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
        >
          {a}
        </li>
      ))}
    </ul>
  );
}
