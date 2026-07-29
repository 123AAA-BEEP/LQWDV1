import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Checkbox } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { ARTICLE_TYPES } from "@/lib/articles";
import { generateArticle, createBlankArticle } from "./actions";

export const metadata: Metadata = { title: "Articles" };
export const dynamic = "force-dynamic";

interface ArticleRow {
  id: string;
  slug: string;
  status: string;
  article_type: string;
  title: string;
  generated_by_ai: boolean;
  published_at: string | null;
  updated_at: string;
}

interface ProjectHit {
  project_id: string;
  project_name: string;
  city: string | null;
  builder_name: string | null;
}

const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "brand"> =
  {
    published: "success",
    in_review: "warning",
    draft: "brand",
    archived: "neutral",
  };

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select(
      "id, slug, status, article_type, title, generated_by_ai, published_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  const articles = (data as ArticleRow[] | null) ?? [];

  // Project picker: server-rendered search over published projects, results
  // become checkboxes inside the generate form.
  let hits: ProjectHit[] = [];
  if (q) {
    const { data: projData } = await supabase
      .from("public_projects_view")
      .select("project_id, project_name, city, builder_name")
      .or(`project_name.ilike.%${q}%,city.ilike.%${q}%`)
      .order("project_name")
      .limit(20);
    hits = (projData as ProjectHit[] | null) ?? [];
  }

  const typeLabel = (v: string) =>
    ARTICLE_TYPES.find((t) => t.value === v)?.label ?? v;

  return (
    <div className="space-y-6">
      <FlashNotice searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }} />

      <div>
        <h2 className="text-lg font-semibold text-ink">Insights articles</h2>
        <p className="mt-1 text-sm text-slate-500">
          AI drafts grounded in published project data; a human reviews and
          publishes. Live articles appear at{" "}
          <Link href="/insights" className="text-brand-700 hover:underline" target="_blank">
            /insights
          </Link>
          . Nothing goes live without your explicit publish.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-ink">Generate a draft</h3>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <Field
                label="Find projects to ground the article in"
                htmlFor="q"
                hint="Search published projects by name or city, then tick the ones to use."
              >
                <Input
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder="e.g. Whitby, or a project name"
                />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          {q ? (
            hits.length === 0 ? (
              <p className="text-sm text-slate-500">
                No published projects match &ldquo;{q}&rdquo;.
              </p>
            ) : (
              <form action={generateArticle} className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {hits.map((p) => (
                    <label
                      key={p.project_id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <Checkbox name="project_id" value={p.project_id} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-800">
                          {p.project_name}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {[p.builder_name, p.city].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-56">
                    <Field label="Article type" htmlFor="article_type">
                      <Select id="article_type" name="article_type" defaultValue="project_spotlight">
                        {ARTICLE_TYPES.filter((t) => t.generatable).map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label} — {t.hint}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Button type="submit">Generate draft</Button>
                </div>
                <p className="text-xs text-slate-400">
                  Uses only public project facts — provenance and broker-only
                  commercials never reach the model. Takes ~20 seconds.
                </p>
              </form>
            )
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Write from scratch</h3>
          <p className="mt-1 text-sm text-slate-500">
            For hand-written pieces — agent guides, brokerage frameworks,
            anything not grounded in project data.
          </p>
          <form
            action={createBlankArticle}
            className="mt-3 flex flex-wrap items-end gap-2"
          >
            <div className="min-w-64 flex-1">
              <Field label="Working title" htmlFor="new_title">
                <Input
                  id="new_title"
                  name="title"
                  placeholder="e.g. What to do after passing your real estate exam in Ontario"
                  required
                />
              </Field>
            </div>
            <div className="min-w-48">
              <Field label="Type" htmlFor="new_type">
                <Select id="new_type" name="article_type" defaultValue="agent_guide">
                  {ARTICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Create draft
            </Button>
          </form>
        </CardBody>
      </Card>

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
          All articles ({articles.length})
        </h3>
        {articles.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-slate-500">
              No articles yet — search for projects above and generate the
              first draft.
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => (
              <Card key={a.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/admin/articles/${a.id}`}
                      className="block truncate font-medium text-ink hover:text-brand-700"
                    >
                      {a.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {typeLabel(a.article_type)} · /insights/{a.slug} ·{" "}
                      updated {new Date(a.updated_at).toLocaleDateString("en-CA")}
                      {a.generated_by_ai ? " · AI draft" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "published" ? (
                      <Link
                        href={`/insights/${a.slug}`}
                        target="_blank"
                        className="text-xs text-brand-700 hover:underline"
                      >
                        View live
                      </Link>
                    ) : null}
                    <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                      {a.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
