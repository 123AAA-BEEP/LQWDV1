import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlashNotice } from "@/components/ui/flash-notice";
import { approveItem, rejectItem } from "./actions";

export const metadata: Metadata = { title: "Approval queue" };
export const dynamic = "force-dynamic";

interface Item {
  id: string;
  playbook: string;
  item_type: string;
  subject_kind: string;
  subject_id: string;
  plain_summary: string;
  claims_manifest: { claim: string; source: string }[];
  lint_results: { rule_id: string; severity: string; pass: boolean; detail?: string }[];
  status: string;
  created_at: string;
}

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

/**
 * The one inbox every playbook stages into. Empty until the first tools run —
 * but fully wired: approve/reject write through the DB-level invariants
 * (block lint can never be approved; publish requires a prior approval).
 */
export default async function ApprovalQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data } = await supabase
    .from("approval_items")
    .select(
      "id, playbook, item_type, subject_kind, subject_id, plain_summary, claims_manifest, lint_results, status, created_at",
    )
    .in("status", ["staged", "triaged"])
    .order("created_at", { ascending: true })
    .limit(50);
  const items = (data as Item[] | null) ?? [];

  return (
    <div className="space-y-4">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div>
        <Link
          href="/dashboard/admin/playbooks"
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          ← Playbooks
        </Link>
        <h2 className="mt-1 text-lg font-semibold text-ink">Approval queue</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
          Everything the playbook tools stage lands here and waits for a human.
          Compliance failures at block level can&apos;t be approved — the
          database refuses, not just the button.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-slate-500">
            Nothing waiting. When the first playbook runs, its drafts appear
            here — one plain-language decision per card.
          </CardBody>
        </Card>
      ) : (
        items.map((item) => {
          const blocks = (item.lint_results ?? []).filter(
            (r) => r.severity === "block" && !r.pass,
          );
          const warns = (item.lint_results ?? []).filter(
            (r) => r.severity === "warn" && !r.pass,
          );
          return (
            <Card key={item.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {item.plain_summary}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.playbook} · {item.item_type.replace(/_/g, " ")} ·{" "}
                      {new Date(item.created_at).toLocaleString("en-CA")}
                    </p>
                  </div>
                  <Badge tone={blocks.length ? "danger" : warns.length ? "warning" : "success"}>
                    {blocks.length
                      ? `${blocks.length} blocking`
                      : warns.length
                        ? `${warns.length} warning${warns.length > 1 ? "s" : ""}`
                        : "lint clean"}
                  </Badge>
                </div>

                {(item.claims_manifest ?? []).length > 0 ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-slate-500">
                      {item.claims_manifest.length} claim
                      {item.claims_manifest.length > 1 ? "s" : ""} with sources
                    </summary>
                    <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                      {item.claims_manifest.map((c, i) => (
                        <li key={i}>
                          {c.claim} <span className="text-slate-400">— {c.source}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                {blocks.concat(warns).map((r) => (
                  <p
                    key={r.rule_id}
                    className={
                      r.severity === "block"
                        ? "text-xs font-medium text-red-700"
                        : "text-xs text-amber-700"
                    }
                  >
                    {r.rule_id}: {r.detail ?? "failed"}
                  </p>
                ))}

                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <form action={approveItem}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <Button type="submit" size="sm" disabled={blocks.length > 0}>
                      Approve
                    </Button>
                  </form>
                  <form action={rejectItem}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      Reject
                    </Button>
                  </form>
                </div>
              </CardBody>
            </Card>
          );
        })
      )}
    </div>
  );
}
