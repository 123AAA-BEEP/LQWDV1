import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { createMicrosite } from "./actions";

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
  let hits: { project_id: string; project_name: string; city: string | null }[] = [];
  if (q) {
    const { data: hitData } = await supabase
      .from("public_projects_view")
      .select("project_id, project_name, city")
      .or(`project_name.ilike.%${q}%,city.ilike.%${q}%`)
      .order("project_name")
      .limit(10);
    hits =
      (hitData as { project_id: string; project_name: string; city: string | null }[] | null) ??
      [];
  }

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
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

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-ink">New microsite</h3>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <Field
                label="Find the project it grounds in"
                htmlFor="q"
                hint="Search published projects by name or city."
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
            <form
              key={h.project_id}
              action={createMicrosite}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-3"
            >
              <input type="hidden" name="project_id" value={h.project_id} />
              <p className="w-full text-sm font-medium text-slate-800">
                {h.project_name}
                {h.city ? ` · ${h.city}` : ""}
              </p>
              <div className="min-w-64 flex-1">
                <Field label="Domain" htmlFor={`d_${h.project_id}`}>
                  <Input
                    id={`d_${h.project_id}`}
                    name="domain"
                    placeholder="e.g. echotownswaterdown.com"
                    required
                  />
                </Field>
              </div>
              <Button type="submit">Create</Button>
            </form>
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
