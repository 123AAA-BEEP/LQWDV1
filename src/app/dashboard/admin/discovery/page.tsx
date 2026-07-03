import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { FlashNotice } from "@/components/ui/flash-notice";
import { igniteSignalAction, dismissSignal, dismissWatch } from "./actions";

export const metadata: Metadata = { title: "Discovery" };
export const dynamic = "force-dynamic";

interface Signal {
  id: string;
  source: string;
  source_url: string | null;
  project_name: string;
  builder_name: string | null;
  address_full: string | null;
  city: string | null;
  status: string;
  project_id: string | null;
  notes: string | null;
  created_at: string;
}

interface Watch {
  id: string;
  source: string;
  address_full: string | null;
  city: string | null;
  description: string | null;
  units: number | null;
  storeys: number | null;
  application_type: string | null;
  application_status: string | null;
  project_name: string | null;
  matched_project_id: string | null;
  status: string;
  first_seen_at: string;
}

const SIGNAL_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  new: "warning",
  matched: "brand",
  ingested: "success",
  duplicate: "neutral",
  dismissed: "neutral",
  error: "danger",
};

const WATCH_TONE: Record<string, "neutral" | "success" | "warning" | "brand"> = {
  watching: "neutral",
  matched: "brand",
  published: "success",
  dismissed: "neutral",
};

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string; flash_tone?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [signalsRes, watchRes, watchCount, builderCount, newCount] =
    await Promise.all([
      supabase
        .from("discovery_signals")
        .select(
          "id, source, source_url, project_name, builder_name, address_full, city, status, project_id, notes, created_at",
        )
        .neq("status", "dismissed")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("discovery_watch")
        .select(
          "id, source, address_full, city, description, units, storeys, application_type, application_status, project_name, matched_project_id, status, first_seen_at",
        )
        .neq("status", "dismissed")
        .order("first_seen_at", { ascending: false })
        .limit(30),
      supabase
        .from("discovery_watch")
        .select("id", { count: "exact", head: true })
        .eq("status", "watching"),
      supabase
        .from("discovery_builders")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("discovery_signals")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
    ]);

  const signals = (signalsRes.data as Signal[] | null) ?? [];
  const watch = (watchRes.data as Watch[] | null) ?? [];

  const key = process.env.INBOUND_EMAIL_SECRET;
  const runUrl = (source: string) =>
    key
      ? `/api/discovery/sweep?key=${encodeURIComponent(key)}&source=${source}&ui=1`
      : null;

  return (
    <div className="space-y-8">
      <FlashNotice searchParams={sp} />

      <div>
        <h2 className="text-lg font-semibold text-ink">Discovery engine</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Addresses lead, names trigger. Planning applications land on the
          watchlist (no page yet — nothing to rank for). The moment a marketing
          name shows up anywhere (UrbanToronto sweep, a forwarded ad), it&apos;s
          cross-referenced against the watchlist and the builder registry, then
          fed through the intake pipeline: geography confirmed → published with
          SEO + IndexNow; thin → draft + email ping. Sweeps run daily on cron.
        </p>
      </div>

      {/* Counters */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Addresses watched" value={watchCount.count ?? 0} />
        <Stat label="New signals" value={newCount.count ?? 0} />
        <Stat
          label="Signals processed"
          value={signals.filter((s) => s.status === "ingested").length}
        />
        <Stat label="Builders in registry" value={builderCount.count ?? 0} />
      </div>

      {/* Manual sweep runners */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["urbantoronto", "Sweep UrbanToronto"],
            ["toronto", "Sweep Toronto planning data"],
            ["seed-builders", "Seed builders from projects"],
            ["bild", "Sweep BILD directory"],
          ] as const
        ).map(([source, label]) => {
          const href = runUrl(source);
          return href ? (
            <a
              key={source}
              href={href}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              {label} ↗
            </a>
          ) : null;
        })}
        {!key ? (
          <p className="text-sm text-slate-500">
            Set INBOUND_EMAIL_SECRET to enable the manual runners.
          </p>
        ) : null}
      </div>

      {/* Signals */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Name signals ({signals.length})
        </h3>
        {signals.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No signals yet — run the UrbanToronto sweep above.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {signals.map((s) => (
                <div key={s.id} className="space-y-1.5 px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={SIGNAL_TONE[s.status] ?? "neutral"} className="capitalize">
                        {s.status}
                      </Badge>
                      <span className="font-medium text-slate-800">
                        {s.project_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {[s.builder_name, s.city].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {s.source} · {new Date(s.created_at).toLocaleDateString("en-CA")}
                    </span>
                  </div>
                  {s.address_full ? (
                    <p className="text-xs text-slate-500">{s.address_full}</p>
                  ) : null}
                  {s.notes ? (
                    <p className="text-xs text-slate-500">{s.notes}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {s.project_id ? (
                      <Link
                        href={`/dashboard/admin/projects/${s.project_id}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Open project →
                      </Link>
                    ) : null}
                    {s.source_url ? (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Source ↗
                      </a>
                    ) : null}
                    {s.status === "new" || s.status === "error" ? (
                      <>
                        <form action={igniteSignalAction}>
                          <input type="hidden" name="signal_id" value={s.id} />
                          <Button type="submit" size="sm">
                            Ignite
                          </Button>
                        </form>
                        <form action={dismissSignal}>
                          <input type="hidden" name="signal_id" value={s.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Dismiss
                          </Button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </section>

      {/* Watchlist */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Address watchlist (latest {watch.length})
        </h3>
        {watch.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              Nothing watched yet — run the Toronto planning-data sweep above.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {watch.map((w) => (
                <div key={w.id} className="space-y-1 px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={WATCH_TONE[w.status] ?? "neutral"} className="capitalize">
                        {w.status}
                      </Badge>
                      <span className="font-medium text-slate-800">
                        {w.address_full ?? "—"}
                      </span>
                      {w.project_name ? (
                        <span className="text-xs font-medium text-brand-700">
                          → {w.project_name}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-slate-400">
                      {[
                        w.application_type,
                        w.units ? `${w.units} units` : null,
                        w.storeys ? `${w.storeys} storeys` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  {w.description ? (
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {w.description}
                    </p>
                  ) : null}
                  {w.status === "watching" ? (
                    <form action={dismissWatch} className="pt-1">
                      <input type="hidden" name="watch_id" value={w.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Dismiss
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody>
        <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
        <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </CardBody>
    </Card>
  );
}
