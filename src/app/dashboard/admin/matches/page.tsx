import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlashNotice } from "@/components/ui/flash-notice";
import { setMatchStatus } from "./actions";

export const metadata: Metadata = { title: "Agent match" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  created_at: string;
  status: string;
  intent: string;
  city: string | null;
  address: string | null;
  property_type: string | null;
  price_band: string | null;
  timeline: string | null;
  name: string;
  email: string;
  phone: string | null;
  matched_agent_profile_ids: string[];
  source: string | null;
}

const BAND_LABEL: Record<string, string> = {
  "under-500k": "Under $500K",
  "500k-750k": "$500K–750K",
  "750k-1m": "$750K–1M",
  "1m-1.5m": "$1M–1.5M",
  "1.5m-2m": "$1.5M–2M",
  "over-2m": "$2M+",
  "not-sure": "Price TBD",
};
const TIMELINE_LABEL: Record<string, string> = {
  asap: "ASAP",
  "1-3-months": "1–3 months",
  "3-6-months": "3–6 months",
  "6-plus-months": "6+ months",
  exploring: "Exploring",
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

function MatchCard({
  r,
  agentNames,
}: {
  r: Row;
  agentNames: string[];
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-ink">
              {r.intent === "both"
                ? "Buying & selling"
                : r.intent === "buying"
                  ? "Buying"
                  : "Selling"}
              {r.city ? ` · ${r.city}` : ""}
              {r.price_band ? ` · ${BAND_LABEL[r.price_band] ?? r.price_band}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {[
                r.property_type,
                r.address,
                r.timeline ? TIMELINE_LABEL[r.timeline] ?? r.timeline : null,
                r.source ? `src: ${r.source}` : null,
                new Date(r.created_at).toLocaleString("en-CA"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
        </div>

        <p className="text-sm text-slate-600">
          {r.name} ·{" "}
          <a
            className="text-brand-700 hover:underline"
            href={`mailto:${encodeURIComponent(r.email)}`}
          >
            {r.email}
          </a>
          {r.phone ? (
            <>
              {" "}
              ·{" "}
              <a
                className="text-brand-700 hover:underline"
                href={`tel:${r.phone.replace(/[^+\d]/g, "")}`}
              >
                {r.phone}
              </a>
            </>
          ) : null}
        </p>

        <p className="text-xs text-slate-400">
          Shown agents:{" "}
          {agentNames.length ? agentNames.join(", ") : "none matched at submit"}
        </p>

        {(NEXT_ACTIONS[r.status] ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {(NEXT_ACTIONS[r.status] ?? []).map((a) => (
              <form key={a.status} action={setMatchStatus}>
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

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data as Row[] | null) ?? [];

  // Resolve shown-agent names in one query.
  const agentIds = [...new Set(rows.flatMap((r) => r.matched_agent_profile_ids))];
  const nameById = new Map<string, string>();
  if (agentIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", agentIds);
    for (const p of (profs as
      | { id: string; first_name: string | null; last_name: string | null }[]
      | null) ?? []) {
      nameById.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || "Agent");
    }
  }
  const namesFor = (r: Row) =>
    r.matched_agent_profile_ids.map((id) => nameById.get(id) ?? "Agent");

  const active = rows.filter((r) => !["closed", "spam"].includes(r.status));
  const done = rows.filter((r) => ["closed", "spam"].includes(r.status)).slice(0, 20);

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div>
        <h2 className="text-lg font-semibold text-ink">Agent-match requests</h2>
        <p className="mt-1 text-sm text-slate-500">
          Consumers from the /match wizard. Shown agents were emailed the
          lead instantly (speed race) — your job is making sure someone
          actually followed up, and routing when no public agent matched.
          Same-day beats everything.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700">
          Working ({active.length})
        </h3>
        {active.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-slate-500">
              No open requests yet. Wizard submissions land here and in the
              ops inbox instantly.
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {active.map((r) => (
              <MatchCard key={r.id} r={r} agentNames={namesFor(r)} />
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
              <MatchCard key={r.id} r={r} agentNames={namesFor(r)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
