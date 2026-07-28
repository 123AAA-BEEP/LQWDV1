import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

interface StatRow {
  page_type: string;
  public_project_page_id: string | null;
  article_id: string | null;
  agent_profile_id: string | null;
  day: string;
  views: number;
  leads: number;
}

interface EventRow {
  referrer_host: string | null;
  utm_source: string | null;
}

const PAGE_TYPE_LABEL: Record<string, string> = {
  project: "Project pages",
  article: "Articles",
  agent_profile: "Agent profiles",
};

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function TopTable({
  title,
  rows,
  names,
  hrefBase,
}: {
  title: string;
  rows: [string, { views: number; leads: number }][];
  names: Map<string, { name: string; slug: string | null }>;
  hrefBase: string;
}) {
  return (
    <Card>
      <CardBody>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No views recorded yet.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-1 font-medium">Page</th>
                <th className="py-1 text-right font-medium">Views</th>
                <th className="py-1 text-right font-medium">Leads</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([id, v]) => {
                const meta = names.get(id);
                return (
                  <tr key={id} className="border-t border-slate-100">
                    <td className="max-w-0 truncate py-1.5 pr-2">
                      {meta?.slug ? (
                        <Link
                          href={`${hrefBase}/${meta.slug}`}
                          target="_blank"
                          className="text-brand-700 hover:underline"
                        >
                          {meta.name}
                        </Link>
                      ) : (
                        <span className="text-slate-600">
                          {meta?.name ?? "(removed)"}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-700">
                      {v.views.toLocaleString("en-CA")}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-700">
                      {v.leads.toLocaleString("en-CA")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  );
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const since30 = daysAgoIso(30);
  const since7 = daysAgoIso(7);

  // Daily rollup (admin-only via security_invoker RLS) + raw source columns
  // for the referrer table. Both fail soft to empty.
  const [{ data: statData }, { data: eventData }] = await Promise.all([
    supabase
      .from("page_stats_daily")
      .select("*")
      .gte("day", since30)
      .limit(5000),
    supabase
      .from("page_events")
      .select("referrer_host, utm_source")
      .gte("occurred_at", `${since30}T00:00:00Z`)
      .limit(5000),
  ]);
  const stats = (statData as StatRow[] | null) ?? [];
  const events = (eventData as EventRow[] | null) ?? [];

  // Totals per page type, 7d and 30d.
  const totals = new Map<
    string,
    { views7: number; leads7: number; views30: number; leads30: number }
  >();
  for (const r of stats) {
    const t = totals.get(r.page_type) ?? {
      views7: 0,
      leads7: 0,
      views30: 0,
      leads30: 0,
    };
    t.views30 += r.views;
    t.leads30 += r.leads;
    if (r.day >= since7) {
      t.views7 += r.views;
      t.leads7 += r.leads;
    }
    totals.set(r.page_type, t);
  }

  // Top pages by 30-day views, per surface.
  const byKey = (
    keyOf: (r: StatRow) => string | null,
  ): [string, { views: number; leads: number }][] => {
    const m = new Map<string, { views: number; leads: number }>();
    for (const r of stats) {
      const k = keyOf(r);
      if (!k) continue;
      const v = m.get(k) ?? { views: 0, leads: 0 };
      v.views += r.views;
      v.leads += r.leads;
      m.set(k, v);
    }
    return [...m.entries()].sort((a, b) => b[1].views - a[1].views).slice(0, 10);
  };
  const topProjects = byKey((r) =>
    r.page_type === "project" ? r.public_project_page_id : null,
  );
  const topArticles = byKey((r) =>
    r.page_type === "article" ? r.article_id : null,
  );

  // Resolve names for the top lists.
  const projNames = new Map<string, { name: string; slug: string | null }>();
  if (topProjects.length) {
    const { data } = await supabase
      .from("public_projects_view")
      .select("public_page_id, project_name, slug")
      .in(
        "public_page_id",
        topProjects.map(([id]) => id),
      );
    for (const p of (data as
      | { public_page_id: string; project_name: string; slug: string | null }[]
      | null) ?? []) {
      projNames.set(p.public_page_id, { name: p.project_name, slug: p.slug });
    }
  }
  const articleNames = new Map<string, { name: string; slug: string | null }>();
  if (topArticles.length) {
    const { data } = await supabase
      .from("articles")
      .select("id, title, slug")
      .in(
        "id",
        topArticles.map(([id]) => id),
      );
    for (const a of (data as
      | { id: string; title: string; slug: string | null }[]
      | null) ?? []) {
      articleNames.set(a.id, { name: a.title, slug: a.slug });
    }
  }

  // Traffic sources: utm_source wins, else external referrer, else direct.
  const sources = new Map<string, number>();
  for (const e of events) {
    const k = e.utm_source
      ? `utm: ${e.utm_source}`
      : (e.referrer_host ?? "direct / none");
    sources.set(k, (sources.get(k) ?? 0) + 1);
  }
  const topSources = [...sources.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">Site analytics</h2>
        <p className="mt-1 text-sm text-slate-500">
          First-party, server-side counts (no tracking script, no cookies) for
          project pages, Insights articles, and agent profiles. Recording
          started when this shipped — history builds from here.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["project", "article", "agent_profile"] as const).map((pt) => {
          const t = totals.get(pt) ?? {
            views7: 0,
            leads7: 0,
            views30: 0,
            leads30: 0,
          };
          return (
            <Card key={pt}>
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {PAGE_TYPE_LABEL[pt]}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                  {t.views30.toLocaleString("en-CA")}
                  <span className="ml-1 text-sm font-normal text-slate-400">
                    views / 30d
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t.views7.toLocaleString("en-CA")} last 7d
                  {pt === "project"
                    ? ` · ${t.leads30.toLocaleString("en-CA")} leads / 30d`
                    : ""}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopTable
          title="Top project pages (30d)"
          rows={topProjects}
          names={projNames}
          hrefBase="/projects"
        />
        <TopTable
          title="Top articles (30d)"
          rows={topArticles}
          names={articleNames}
          hrefBase="/insights"
        />
      </div>

      <Card>
        <CardBody>
          <h3 className="text-sm font-semibold text-ink">
            Traffic sources (30d)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            UTM-tagged campaigns first, then external referrers; everything
            else is direct or same-site.
          </p>
          {topSources.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No events yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {topSources.map(([source, count]) => (
                <li
                  key={source}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-slate-600">{source}</span>
                  <span className="tabular-nums text-slate-700">
                    {count.toLocaleString("en-CA")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
