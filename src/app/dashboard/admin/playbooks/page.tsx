import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ROADMAP_STEPS,
  MODULES,
  SUITE_ORDER,
  STATUS_LABEL,
  type PlaybookModule,
} from "@/lib/playbooks/catalog";

export const metadata: Metadata = { title: "Playbooks" };
export const dynamic = "force-dynamic";

/**
 * The agent's-eye prototype of the playbook tier, living in admin so the
 * founder iterates on copy, ordering, and card anatomy BEFORE any of it
 * ships to realtors. Renders straight from src/lib/playbooks/catalog.ts —
 * the module cards follow the positioning blueprint's three-line anatomy
 * exactly, so what you see here is the doctrine applied.
 */
export default async function AdminPlaybooksPage() {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const [{ count: queued }, { count: rules }] = await Promise.all([
    supabase
      .from("approval_items")
      .select("id", { count: "exact", head: true })
      .in("status", ["staged", "triaged"]),
    supabase
      .from("compliance_rules")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
  ]);

  const tierTone = (tier: string) =>
    tier === "free" ? "success" : tier === "premium" ? "brand" : "warning";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Playbooks</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            The agent tier, exactly as a realtor will see it — iterate on the
            copy and ordering here before any of it ships. Cards follow the
            positioning rules: benefit-first headline, one sentence + one
            number, free/paid labeled.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/playbooks/queue"
            className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Approval queue{queued ? ` (${queued})` : ""}
          </Link>
          <Badge tone="neutral">{rules ?? 0} compliance rules active</Badge>
        </div>
      </div>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">The roadmap</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            The guided path an agent lands on. Soft steps nudge
            (&quot;best after&quot;); hard gates say why in plain language.
          </p>
          <ol className="mt-4 space-y-3">
            {ROADMAP_STEPS.map((s) => (
              <li key={s.id} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {s.n}
                </span>
                <div>
                  <p className="font-medium text-slate-800">
                    {s.title}{" "}
                    <Badge
                      tone={
                        s.tier === "free"
                          ? "success"
                          : s.tier === "paid"
                            ? "warning"
                            : "neutral"
                      }
                      className="ml-1 align-middle"
                    >
                      {s.tier === "mixed" ? "free + paid" : s.tier}
                    </Badge>
                  </p>
                  <p className="text-sm text-slate-500">{s.body}</p>
                  {s.hardGate ? (
                    <p className="mt-0.5 text-xs font-medium text-amber-700">
                      Hard gate: {s.hardGate}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {SUITE_ORDER.map((suite) => (
        <section key={suite}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {suite}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.filter((m) => m.suite === suite).map((m) => (
              <ModuleCard key={m.tool} m={m} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-400">
        Internal tool ids and build status are shown here for you only — they
        never render on agent surfaces. Copy lives in
        <code className="mx-1 rounded bg-slate-100 px-1">
          src/lib/playbooks/catalog.ts
        </code>
        — say what to change and it changes.
      </p>
    </div>
  );

  function ModuleCard({ m }: { m: PlaybookModule }) {
    const step = ROADMAP_STEPS.find((s) => s.id === m.bestAfter);
    return (
      <Card>
        <CardBody className="flex h-full flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-snug text-ink">{m.headline}</p>
            <Badge tone={tierTone(m.tier)}>{m.tier}</Badge>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{m.body}</p>
          <p className="text-xs font-medium text-slate-500">{m.anchor}</p>
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
            <span>
              {m.tool} · {STATUS_LABEL[m.status]}
            </span>
            {step ? <span>Best after: {step.title}</span> : <span>Start here</span>}
          </div>
        </CardBody>
      </Card>
    );
  }
}
