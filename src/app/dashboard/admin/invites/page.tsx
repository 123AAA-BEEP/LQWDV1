import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { isEmailConfigured } from "@/lib/email";
import {
  generateInviteDrafts,
  setInviteStatus,
  approveAllDrafts,
  sendApprovedBatch,
} from "./actions";

export const metadata: Metadata = { title: "Claim invites" };
export const dynamic = "force-dynamic";

interface Invite {
  id: string;
  claim_email: string;
  agent_name: string | null;
  brokerage_name: string | null;
  phone: string | null;
  listing_count: number;
  subject: string;
  body_html: string;
  status: "draft" | "approved" | "sent" | "skipped" | "failed";
  error: string | null;
  sent_at: string | null;
}

const TONE: Record<Invite["status"], "neutral" | "success" | "warning" | "danger" | "brand"> = {
  draft: "warning",
  approved: "brand",
  sent: "success",
  skipped: "neutral",
  failed: "danger",
};

async function generateAction() {
  "use server";
  await generateInviteDrafts();
}

export default async function InvitesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("off_market_invites")
    .select("*")
    .order("listing_count", { ascending: false });
  const invites = (data ?? []) as Invite[];

  const counts = { draft: 0, approved: 0, sent: 0, skipped: 0, failed: 0 };
  for (const i of invites) counts[i.status] += 1;
  const mailReady = isEmailConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">
          Off-market claim invites
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          One email per agent with their personal claim links. Generate drafts,
          review each one (exactly as it will send), approve, then send in
          batches of 20 — click Send once a day for a safe, warm pace. Replies
          go to the ops inbox; anyone who replies &quot;remove&quot; gets
          tombstoned.
        </p>
      </div>

      {!mailReady ? (
        <Notice tone="warning">
          Resend isn&apos;t configured (RESEND_API_KEY missing) — sends will
          fail until it&apos;s set.
        </Notice>
      ) : null}

      {/* Pipeline + controls */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="warning">{counts.draft} drafts</Badge>
            <Badge tone="brand">{counts.approved} approved</Badge>
            <Badge tone="success">{counts.sent} sent</Badge>
            <Badge tone="neutral">{counts.skipped} skipped</Badge>
            {counts.failed ? <Badge tone="danger">{counts.failed} failed</Badge> : null}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <form action={generateAction}>
              <SubmitButton variant="secondary" size="sm" pendingLabel="Generating…">
                Generate / refresh drafts
              </SubmitButton>
            </form>
            {counts.draft > 0 ? (
              <form action={approveAllDrafts}>
                <SubmitButton variant="secondary" size="sm" pendingLabel="Approving…">
                  Approve all drafts
                </SubmitButton>
              </form>
            ) : null}
            {counts.approved > 0 ? (
              <form action={sendApprovedBatch}>
                <SubmitButton size="sm" pendingLabel="Sending batch…">
                  Send next {Math.min(counts.approved, 20)} approved
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {invites.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-slate-500">
            No invites yet — hit &quot;Generate / refresh drafts&quot; to build
            one per agent from the enriched off-market listings.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => (
            <Card key={inv.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {inv.agent_name ?? inv.claim_email}
                      <span className="ml-2 text-sm font-normal text-slate-400">
                        {inv.listing_count} listing{inv.listing_count === 1 ? "" : "s"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {inv.claim_email}
                      {inv.brokerage_name ? ` · ${inv.brokerage_name}` : ""}
                      {inv.phone ? ` · ${inv.phone}` : ""}
                      {inv.sent_at
                        ? ` · sent ${new Date(inv.sent_at).toLocaleString("en-CA")}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone={TONE[inv.status]} className="capitalize">
                    {inv.status}
                  </Badge>
                </div>

                <p className="text-sm text-slate-700">
                  <span className="font-medium">Subject:</span> {inv.subject}
                </p>
                {inv.error ? (
                  <p className="text-xs text-red-600">{inv.error}</p>
                ) : null}

                <details>
                  <summary className="cursor-pointer text-sm font-medium text-brand-700">
                    Preview email
                  </summary>
                  <div
                    className="mt-3 overflow-hidden rounded-lg border border-slate-200"
                    dangerouslySetInnerHTML={{ __html: inv.body_html }}
                  />
                </details>

                {inv.status !== "sent" ? (
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {inv.status !== "approved" ? (
                      <form action={setInviteStatus}>
                        <input type="hidden" name="invite_id" value={inv.id} />
                        <Button type="submit" name="status" value="approved" size="sm">
                          Approve
                        </Button>
                      </form>
                    ) : null}
                    {inv.status !== "skipped" ? (
                      <form action={setInviteStatus}>
                        <input type="hidden" name="invite_id" value={inv.id} />
                        <Button type="submit" name="status" value="skipped" size="sm" variant="secondary">
                          Skip
                        </Button>
                      </form>
                    ) : null}
                    {inv.status !== "draft" ? (
                      <form action={setInviteStatus}>
                        <input type="hidden" name="invite_id" value={inv.id} />
                        <Button type="submit" name="status" value="draft" size="sm" variant="ghost">
                          Back to draft
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
