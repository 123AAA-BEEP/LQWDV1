import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { createMicrosite } from "./actions";
import { domainCandidates, marketFor } from "@/lib/microsites";
import {
  vercelDomainsConfigured,
  checkDomain,
  DOMAIN_MAX_USD,
  type DomainCheck,
} from "@/lib/vercel-domains";

export const metadata: Metadata = { title: "Microsites" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  domain: string;
  project_id: string;
  status: string;
  content: unknown;
  updated_at: string;
}

const STATUS_TONE: Record<string, "success" | "brand" | "neutral"> = {
  live: "success",
  draft: "brand",
  retired: "neutral",
};

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

export default async function AdminMicrositesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const supabase = await createClient();

  const { data } = await supabase
    .from("microsite_configs")
    .select("id, domain, project_id, status, content, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  const rows = (data as Row[] | null) ?? [];

  // Resolve project names for the list + optional picker search.
  const projIds = [...new Set(rows.map((r) => r.project_id))];
  const nameById = new Map<string, string>();
  if (projIds.length) {
    const { data: projData } = await supabase
      .from("public_projects_view")
      .select("project_id, project_name")
      .in("project_id", projIds);
    for (const p of (projData as { project_id: string; project_name: string }[] | null) ?? []) {
      nameById.set(p.project_id, p.project_name);
    }
  }
  let hits: {
    project_id: string;
    project_name: string;
    city: string | null;
    province: string | null;
  }[] = [];
  if (q) {
    const { data: hitData } = await supabase
      .from("public_projects_view")
      .select("project_id, project_name, city, province")
      .or(`project_name.ilike.%${q}%,city.ilike.%${q}%`)
      .order("project_name")
      .limit(10);
    hits =
      (hitData as typeof hits | null) ?? [];
  }

  // Domain picker: founder chooses from 5 ranked branded candidates (with
  // live availability + price when Vercel env is set), or spins up 5 more.
  const suggestFor = first(sp.suggest);
  const round = Math.max(0, Math.min(10, Number(first(sp.round)) || 0));
  const suggestProject = hits.find((h) => h.project_id === suggestFor) ?? null;
  let suggestions: { domain: string; check: DomainCheck | null }[] = [];
  if (suggestProject) {
    const candidates = domainCandidates(
      suggestProject.project_name,
      suggestProject.city,
      marketFor(suggestProject.province),
      round,
    );
    const checks = vercelDomainsConfigured()
      ? await Promise.all(candidates.map((d) => checkDomain(d)))
      : candidates.map(() => null);
    suggestions = candidates.map((domain, i) => ({ domain, check: checks[i] }));
  }

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h2 className="text-lg font-semibold text-ink">Microsites</h2>
        <p className="mt-1 text-sm text-slate-500">
          Standalone single-project landing sites on their own domains — the
          first-to-market lead machines. Flow: buy the domain → create the
          config here → add context → generate → review → set live → attach
          the domain to the Vercel project. Leads land in the normal queue,
          source-tagged.
        </p>
        </div>
        <Link
          href="/dashboard/admin/microsites/stock"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Stock image library →
        </Link>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-ink">New microsite</h3>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <Field
                label="Find the project it grounds in"
                htmlFor="q"
                hint="Search published projects by name or city. Project not in LIQWD yet? Forward the builder's page to the intake inbox with 'microsite: yourdomain.com' in the subject — the project AND this config get created together."
              >
                <Input id="q" name="q" defaultValue={q} placeholder="e.g. Echo" />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          {q && hits.length === 0 ? (
            <p className="text-sm text-slate-500">No published projects match.</p>
          ) : null}
          {hits.map((h) => (
            <div
              key={h.project_id}
              className="space-y-3 rounded-lg border border-slate-200 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  {h.project_name}
                  {h.city ? ` · ${h.city}` : ""}
                </p>
                <Link
                  href={`/dashboard/admin/microsites?q=${encodeURIComponent(q)}&suggest=${h.project_id}&round=0`}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  Suggest domains →
                </Link>
              </div>

              {suggestProject?.project_id === h.project_id ? (
                <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Pick one (round {round + 1}
                    {marketFor(h.province) === "us" ? " · US market, .com only" : ""})
                  </p>
                  {suggestions.map((s) => {
                    const available = s.check?.available ?? null;
                    const price = s.check?.price ?? null;
                    const overCap = price != null && price > DOMAIN_MAX_USD;
                    return (
                      <div
                        key={s.domain}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2"
                      >
                        <p className="font-mono text-sm text-slate-800">{s.domain}</p>
                        <div className="flex items-center gap-2">
                          {available === false ? (
                            <Badge tone="neutral">taken</Badge>
                          ) : available === true ? (
                            <Badge tone={overCap ? "warning" : "success"}>
                              {price != null
                                ? overCap
                                  ? `US$${price} · over $${DOMAIN_MAX_USD} cap`
                                  : `US$${price}/yr`
                                : "available"}
                            </Badge>
                          ) : (
                            <Badge tone="neutral">check manually</Badge>
                          )}
                          {available !== false ? (
                            <form action={createMicrosite}>
                              <input type="hidden" name="project_id" value={h.project_id} />
                              <input type="hidden" name="domain" value={s.domain} />
                              <Button type="submit" size="sm">
                                Go with this
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <Link
                    href={`/dashboard/admin/microsites?q=${encodeURIComponent(q)}&suggest=${h.project_id}&round=${round + 1}`}
                    className="inline-block text-sm font-medium text-brand-700 hover:underline"
                  >
                    Spin up 5 more →
                  </Link>
                </div>
              ) : null}

              <form
                action={createMicrosite}
                className="flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="project_id" value={h.project_id} />
                <div className="min-w-64 flex-1">
                  <Field label="Or type a domain" htmlFor={`d_${h.project_id}`}>
                    <Input
                      id={`d_${h.project_id}`}
                      name="domain"
                      placeholder="e.g. echotownswaterdown.com"
                      required
                    />
                  </Field>
                </div>
                <Button type="submit" variant="secondary">
                  Create
                </Button>
              </form>
            </div>
          ))}
        </CardBody>
      </Card>

      <section className="space-y-2">
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
          All microsites ({rows.length})
        </h3>
        {rows.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-slate-500">
              None yet — search a project above to create the first.
            </CardBody>
          </Card>
        ) : (
          rows.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/admin/microsites/${r.id}`}
                    className="font-medium text-ink hover:text-brand-700"
                  >
                    {r.domain}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {nameById.get(r.project_id) ?? "Unknown project"} ·{" "}
                    {r.content ? "content ready" : "no content yet"} · updated{" "}
                    {new Date(r.updated_at).toLocaleDateString("en-CA")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "live" ? (
                    <a
                      href={`https://${r.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-700 hover:underline"
                    >
                      Visit ↗
                    </a>
                  ) : null}
                  <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
