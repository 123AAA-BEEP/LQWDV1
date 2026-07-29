import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlashNotice } from "@/components/ui/flash-notice";
import { setValuationStatus } from "./actions";

export const metadata: Metadata = { title: "Home values" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  created_at: string;
  status: string;
  address: string;
  city: string | null;
  property_type: string | null;
  beds: string | null;
  baths: string | null;
  timeline: string | null;
  details: string | null;
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
  source_city_slug: string | null;
}

const TIMELINE_LABEL: Record<string, string> = {
  asap: "ASAP",
  "3-6-months": "3–6 months",
  "6-12-months": "6–12 months",
  "just-curious": "Just curious",
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

function RequestCard({ r }: { r: Row }) {
  return (
    <Card key={r.id}>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-ink">
              {r.address}
              {r.city ? `, ${r.city}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {[
                r.property_type,
                r.beds ? `${r.beds} bed` : null,
                r.baths ? `${r.baths} bath` : null,
                r.timeline ? TIMELINE_LABEL[r.timeline] ?? r.timeline : null,
                new Date(r.created_at).toLocaleString("en-CA"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
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
              <form key={a.status} action={setValuationStatus}>
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

export default async function AdminValuationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("valuation_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data as Row[] | null) ?? [];
  const active = rows.filter((r) => !["closed", "spam"].includes(r.status));
  const done = rows.filter((r) => ["closed", "spam"].includes(r.status)).slice(0, 20);

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div>
        <h2 className="text-lg font-semibold text-ink">
          Home-value requests
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Seller leads from /home-value. Route each to a local agent for a
          CMA — speed decides these. (Automatic agent distribution is a later
          phase.)
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700">
          Working ({active.length})
        </h3>
        {active.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-slate-500">
              No open requests. New ones land here (and in the ops inbox) the
              moment a homeowner submits the form.
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {active.map((r) => (
              <RequestCard key={r.id} r={r} />
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
              <RequestCard key={r.id} r={r} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
