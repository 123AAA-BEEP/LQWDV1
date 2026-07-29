import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlashNotice } from "@/components/ui/flash-notice";
import { setAssignmentValuationStatus } from "./actions";

export const metadata: Metadata = { title: "Assignment values" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  created_at: string;
  status: string;
  project_name: string;
  city: string | null;
  matched_project_id: string | null;
  purchase_price: number | null;
  purchase_year: string | null;
  unit_type: string | null;
  beds: string | null;
  stage: string | null;
  aps_assignment_clause: string | null;
  details: string | null;
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
  source: string | null;
}

const STAGE_LABEL: Record<string, string> = {
  "pre-occupancy": "Under construction",
  "interim-occupancy": "Interim occupancy",
  "closing-soon": "Closing soon",
  "not-sure": "Stage unknown",
};
const STATUS_TONE: Record<string, "brand" | "warning" | "success" | "neutral" | "danger"> = {
  new: "brand",
  contacted: "warning",
  qualified: "success",
  closed: "neutral",
  spam: "danger",
};
const NEXT_ACTIONS: Record<string, { status: string; label: string }[]> = {
  new: [
    { status: "contacted", label: "Mark contacted" },
    { status: "spam", label: "Spam" },
  ],
  contacted: [
    { status: "qualified", label: "Qualified — working it" },
    { status: "closed", label: "Close out" },
  ],
  qualified: [{ status: "closed", label: "Close out" }],
  closed: [],
  spam: [],
};

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

function RequestCard({
  r,
  matchedSlug,
}: {
  r: Row;
  matchedSlug: string | null;
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-ink">
              {r.project_name}
              {r.city ? `, ${r.city}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {[
                r.unit_type,
                r.beds ? `${r.beds} bed` : null,
                r.purchase_price
                  ? `paid $${Math.round(r.purchase_price).toLocaleString("en-CA")}${r.purchase_year ? ` (${r.purchase_year})` : ""}`
                  : r.purchase_year
                    ? `signed ${r.purchase_year}`
                    : null,
                r.stage ? STAGE_LABEL[r.stage] ?? r.stage : null,
                r.aps_assignment_clause
                  ? `APS: ${r.aps_assignment_clause}`
                  : null,
                new Date(r.created_at).toLocaleString("en-CA"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {matchedSlug ? (
              <Link
                href={`/projects/${matchedSlug}`}
                target="_blank"
                className="mt-1 inline-block text-xs text-brand-700 hover:underline"
              >
                Matched to tracked inventory →
              </Link>
            ) : null}
          </div>
          <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
        </div>

        <p className="text-sm text-slate-600">
          {r.owner_name} ·{" "}
          <a
            className="text-brand-700 hover:underline"
            href={`mailto:${encodeURIComponent(r.owner_email)}`}
          >
            {r.owner_email}
          </a>
          {r.owner_phone ? (
            <>
              {" "}
              ·{" "}
              <a
                className="text-brand-700 hover:underline"
                href={`tel:${r.owner_phone.replace(/[^+\d]/g, "")}`}
              >
                {r.owner_phone}
              </a>
            </>
          ) : null}
        </p>

        {r.details ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {r.details}
          </p>
        ) : null}

        {(NEXT_ACTIONS[r.status] ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {(NEXT_ACTIONS[r.status] ?? []).map((a) => (
              <form key={a.status} action={setAssignmentValuationStatus}>
                <input type="hidden" name="request_id" value={r.id} />
                <input type="hidden" name="status" value={a.status} />
                <Button type="submit" size="sm" variant="secondary">
                  {a.label}
                </Button>
              </form>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

export default async function AdminAssignmentValuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignment_valuation_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data as Row[] | null) ?? [];

  // Resolve matched-inventory slugs for quick jumps.
  const matchedIds = [
    ...new Set(rows.map((r) => r.matched_project_id).filter(Boolean)),
  ] as string[];
  const slugById = new Map<string, string>();
  if (matchedIds.length) {
    const { data: projData } = await supabase
      .from("public_projects_view")
      .select("project_id, slug")
      .in("project_id", matchedIds);
    for (const p of (projData as
      | { project_id: string; slug: string | null }[]
      | null) ?? []) {
      if (p.slug) slugById.set(p.project_id, p.slug);
    }
  }

  const active = rows.filter((r) => !["closed", "spam"].includes(r.status));
  const done = rows.filter((r) => ["closed", "spam"].includes(r.status)).slice(0, 20);

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div>
        <h2 className="text-lg font-semibold text-ink">
          Assignment-valuation requests
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Pre-construction owners from /assignment-value asking what their
          assignment is worth. Route to an assignment-savvy agent fast —
          closing dates make these time-critical. Qualified ones can become
          Assignment Desk listings via the agent (owner&apos;s consent, gated
          board, never public).
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700">
          Working ({active.length})
        </h3>
        {active.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-slate-500">
              No open requests. Wizard submissions land here and in the ops
              inbox instantly.
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {active.map((r) => (
              <RequestCard
                key={r.id}
                r={r}
                matchedSlug={
                  r.matched_project_id
                    ? (slugById.get(r.matched_project_id) ?? null)
                    : null
                }
              />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
            Recently closed
          </h3>
          <div className="space-y-3">
            {done.map((r) => (
              <RequestCard
                key={r.id}
                r={r}
                matchedSlug={
                  r.matched_project_id
                    ? (slugById.get(r.matched_project_id) ?? null)
                    : null
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
