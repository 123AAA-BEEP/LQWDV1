import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireUserProfile, isAdmin, isDeveloper } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { FlashNotice } from "@/components/ui/flash-notice";
import { MODULES } from "@/lib/playbooks/catalog";
import { approveOwnItem, rejectOwnItem } from "./actions";

export const metadata: Metadata = { title: "Approvals" };
export const dynamic = "force-dynamic";

/**
 * The one decision inbox (agent-panel UX reorg, Phase 4). Everything a
 * playbook tool drafts for this agent lands here as one plain-language
 * decision; module pages deep-link in, never host their own approve buttons.
 * This is the only place in the rail that carries a numeric badge.
 */

interface Item {
  id: string;
  playbook: string;
  item_type: string;
  plain_summary: string;
  claims_manifest: { claim: string; source: string }[];
  lint_results: { rule_id: string; severity: string; pass: boolean; detail?: string }[];
  status: string;
  created_at: string;
  decided_at: string | null;
}

const COLS =
  "id, playbook, item_type, plain_summary, claims_manifest, lint_results, status, created_at, decided_at";

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

/** Agent-facing name for the tool that made an item — the headline, never the codename. */
function toolName(code: string): string {
  const m = MODULES.find((x) => x.tool === code);
  return m?.headline ?? "LIQWD";
}

const TYPE_LABEL: Record<string, string> = {
  page_draft: "a page",
  content_draft: "a post",
  change_set: "a change",
  outreach_draft: "an email",
  gbp_draft: "a Google post",
  ad_draft: "an ad",
};

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "neutral" | "brand" }> = {
  approved: { label: "Approved", tone: "success" },
  published: { label: "Live", tone: "brand" },
  rejected: { label: "Rejected", tone: "neutral" },
};

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { profile } = await requireUserProfile();

  if (isDeveloper(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Approvals</h1>
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            Approvals are for realtor accounts.
          </CardBody>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: waitingData }, { data: decidedData }] = await Promise.all([
    supabase
      .from("approval_items")
      .select(COLS)
      .eq("subject_kind", "realtor")
      .eq("subject_id", profile.id)
      .in("status", ["staged", "triaged"])
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("approval_items")
      .select(COLS)
      .eq("subject_kind", "realtor")
      .eq("subject_id", profile.id)
      .in("status", ["approved", "rejected", "published"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const waiting = (waitingData as Item[] | null) ?? [];
  const decided = (decidedData as Item[] | null) ?? [];

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Approvals</h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Everything LIQWD drafts for you lands here first: pages, posts,
            replies, emails. Nothing goes out without your OK. One plain
            decision per card.
          </p>
        </div>
        {isAdmin(profile) ? (
          <ButtonLink href="/dashboard/admin/playbooks/queue" variant="secondary" size="sm">
            All agents&apos; queue
          </ButtonLink>
        ) : null}
      </div>

      {waiting.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="size-5 text-emerald-700" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-ink">Nothing waiting on you.</p>
              <p className="mt-0.5 text-sm text-slate-500">
                When a tool drafts something for you, it shows up here as one
                decision. Start with the plan to see what&apos;s ready.
              </p>
            </div>
          </div>
          <ButtonLink href="/dashboard/marketing" size="sm" variant="secondary">
            Open marketing plan
          </ButtonLink>
        </div>
      ) : (
        <ol className="space-y-3">
          {waiting.map((item) => {
            const blocks = (item.lint_results ?? []).filter(
              (r) => r.severity === "block" && !r.pass,
            );
            const warns = (item.lint_results ?? []).filter(
              (r) => r.severity === "warn" && !r.pass,
            );
            return (
              <li key={item.id}>
                <Card>
                  <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{item.plain_summary}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {toolName(item.playbook)} drafted{" "}
                          {TYPE_LABEL[item.item_type] ?? "something"} ·{" "}
                          {new Date(item.created_at).toLocaleDateString("en-CA", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge tone={blocks.length ? "danger" : warns.length ? "warning" : "success"}>
                        {blocks.length
                          ? "Needs a fix first"
                          : warns.length
                            ? `${warns.length} thing${warns.length > 1 ? "s" : ""} to check`
                            : "Checks passed"}
                      </Badge>
                    </div>

                    {(item.claims_manifest ?? []).length > 0 ? (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-slate-500">
                          Where the {item.claims_manifest.length === 1 ? "number comes" : "numbers come"}{" "}
                          from
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
                        {r.detail ?? "One of our checks didn't pass."}
                      </p>
                    ))}

                    <div className="flex gap-2 border-t border-slate-100 pt-3">
                      <form action={approveOwnItem}>
                        <input type="hidden" name="item_id" value={item.id} />
                        <Button type="submit" size="sm" disabled={blocks.length > 0}>
                          Approve
                        </Button>
                      </form>
                      <form action={rejectOwnItem}>
                        <input type="hidden" name="item_id" value={item.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          Not this one
                        </Button>
                      </form>
                      {blocks.length > 0 ? (
                        <span className="self-center text-xs text-slate-400">
                          We&apos;ll redraft this one.
                        </span>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      {decided.length > 0 ? (
        <section aria-labelledby="decided">
          <h2
            id="decided"
            className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
          >
            Recently decided
          </h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {decided.map((item) => {
              const s = STATUS_LABEL[item.status] ?? { label: item.status, tone: "neutral" as const };
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">{item.plain_summary}</p>
                    <p className="text-xs text-slate-400">
                      {toolName(item.playbook)} ·{" "}
                      {new Date(item.decided_at ?? item.created_at).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-slate-400">
        Approving means &quot;send it&quot;. Rejecting keeps the draft on record
        and nothing goes out. Anything that fails a compliance check can&apos;t be
        approved until it&apos;s fixed, by design.{" "}
        <Link href="/dashboard/marketing" className="font-medium text-slate-600 hover:underline">
          See the plan
        </Link>
      </p>
    </div>
  );
}
