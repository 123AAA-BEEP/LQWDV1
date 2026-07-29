import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { ARTICLE_TYPES } from "@/lib/articles";
import { updateArticle, setArticleStatus, deleteArticle } from "../actions";

export const metadata: Metadata = { title: "Edit article" };
export const dynamic = "force-dynamic";

interface Article {
  id: string;
  slug: string;
  status: string;
  article_type: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  seo_title: string | null;
  seo_meta_description: string | null;
  hero_image_url: string | null;
  related_project_ids: string[];
  generated_by_ai: boolean;
  indexable: boolean;
  editor_notes: string | null;
  published_at: string | null;
  updated_at: string;
}

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

function StatusButton({
  articleId,
  currentStatus,
  status,
  label,
  variant = "secondary",
}: {
  articleId: string;
  currentStatus: string;
  status: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <form action={setArticleStatus}>
      <input type="hidden" name="article_id" value={articleId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="back_to" value="editor" />
      <Button
        type="submit"
        size="sm"
        variant={variant}
        disabled={currentStatus === status}
      >
        {label}
      </Button>
    </form>
  );
}

export default async function AdminArticleEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select(
      "id, slug, status, article_type, title, excerpt, body_md, seo_title, seo_meta_description, hero_image_url, related_project_ids, generated_by_ai, indexable, editor_notes, published_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  const article = (data as Article | null) ?? null;
  if (!article) notFound();

  // Names of the grounding projects, so the reviewer can fact-check.
  let related: { project_name: string; slug: string | null }[] = [];
  if (article.related_project_ids.length) {
    const { data: rel } = await supabase
      .from("public_projects_view")
      .select("project_name, slug")
      .in("project_id", article.related_project_ids);
    related =
      (rel as { project_name: string; slug: string | null }[] | null) ?? [];
  }

  const typeLabel =
    ARTICLE_TYPES.find((t) => t.value === article.article_type)?.label ??
    article.article_type;

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/admin/articles"
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            ← All articles
          </Link>
          <h2 className="mt-1 text-lg font-semibold text-ink">{article.title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {typeLabel}
            {article.generated_by_ai ? " · AI draft — verify every fact" : ""}
            {article.published_at
              ? ` · first published ${new Date(article.published_at).toLocaleDateString("en-CA")}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {article.status === "published" ? (
            <Link
              href={`/insights/${article.slug}`}
              target="_blank"
              className="text-xs text-brand-700 hover:underline"
            >
              View live
            </Link>
          ) : null}
          <Badge
            tone={
              article.status === "published"
                ? "success"
                : article.status === "in_review"
                  ? "warning"
                  : article.status === "draft"
                    ? "brand"
                    : "neutral"
            }
          >
            {article.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium text-slate-600">
            Workflow:
          </span>
          <StatusButton articleId={article.id} currentStatus={article.status} status="draft" label="Back to draft" />
          <StatusButton articleId={article.id} currentStatus={article.status} status="in_review" label="Ready for review" />
          <StatusButton articleId={article.id} currentStatus={article.status} status="published" label="Publish" variant="primary" />
          <StatusButton articleId={article.id} currentStatus={article.status} status="archived" label="Archive" />
          <div className="ml-auto">
            <form action={deleteArticle}>
              <input type="hidden" name="article_id" value={article.id} />
              <Button type="submit" size="sm" variant="secondary">
                Delete
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>

      {article.editor_notes ? (
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-ink">
              Editor-in-chief notes
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
              {article.editor_notes}
            </p>
            {article.status === "in_review" ? (
              <p className="mt-2 text-xs text-amber-700">
                The editor agent held this piece instead of publishing —
                resolve the note above, then publish.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {related.length > 0 ? (
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-ink">
              Grounded in ({related.length})
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Every fact in the article must trace back to these listings —
              open them side-by-side while reviewing.
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {related.map((p) => (
                <li key={p.slug ?? p.project_name}>
                  {p.slug ? (
                    <Link
                      href={`/projects/${p.slug}`}
                      target="_blank"
                      className="text-sm text-brand-700 hover:underline"
                    >
                      {p.project_name}
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-600">
                      {p.project_name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <form action={updateArticle} className="space-y-4">
            <input type="hidden" name="article_id" value={article.id} />
            <Field label="Title" htmlFor="title">
              <Input id="title" name="title" defaultValue={article.title} required />
            </Field>
            <Field
              label="Slug"
              htmlFor="slug"
              hint={`Live URL: /insights/${article.slug}`}
            >
              <Input id="slug" name="slug" defaultValue={article.slug} required />
            </Field>
            <Field
              label="Excerpt"
              htmlFor="excerpt"
              hint="Standfirst shown on the index page and as a meta fallback."
            >
              <Textarea
                id="excerpt"
                name="excerpt"
                className="min-h-16"
                defaultValue={article.excerpt ?? ""}
              />
            </Field>
            <Field
              label="Body (markdown)"
              htmlFor="body_md"
              hint="## and ### headings, paragraphs, - lists, **bold**, [links](https://…)."
            >
              <Textarea
                id="body_md"
                name="body_md"
                className="min-h-96 font-mono text-xs"
                defaultValue={article.body_md}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SEO title" htmlFor="seo_title" hint="≤ 60 chars.">
                <Input
                  id="seo_title"
                  name="seo_title"
                  defaultValue={article.seo_title ?? ""}
                />
              </Field>
              <Field
                label="Meta description"
                htmlFor="seo_meta_description"
                hint="140–160 chars."
              >
                <Input
                  id="seo_meta_description"
                  name="seo_meta_description"
                  defaultValue={article.seo_meta_description ?? ""}
                />
              </Field>
            </div>
            <Field
              label="Hero image URL"
              htmlFor="hero_image_url"
              hint="Optional — a public image URL (e.g. a project hero already in storage)."
            >
              <Input
                id="hero_image_url"
                name="hero_image_url"
                defaultValue={article.hero_image_url ?? ""}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox name="indexable" defaultChecked={article.indexable} />
              Allow search engines to index this article
            </label>
            <Button type="submit">Save changes</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
