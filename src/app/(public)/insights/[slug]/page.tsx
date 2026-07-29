import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordPageEvent } from "@/lib/analytics";
import { renderMarkdown, markdownToPlainText } from "@/lib/markdown";
import { ARTICLE_TYPES } from "@/lib/articles";

export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/$/, "");

interface Article {
  id: string;
  slug: string;
  article_type: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  seo_title: string | null;
  seo_meta_description: string | null;
  hero_image_url: string | null;
  related_project_ids: string[];
  indexable: boolean;
  published_at: string | null;
}

interface RelatedProject {
  slug: string | null;
  project_name: string;
  city: string | null;
  hero_image_url: string | null;
  price_from_public: number | null;
}

async function getArticle(slug: string): Promise<Article | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_articles_view")
    .select(
      "id, slug, article_type, title, excerpt, body_md, seo_title, seo_meta_description, hero_image_url, related_project_ids, indexable, published_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as Article | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Article not found" };
  const description =
    article.seo_meta_description ??
    article.excerpt ??
    markdownToPlainText(article.body_md, 160);
  return {
    title: article.seo_title ?? article.title,
    description,
    alternates: { canonical: `/insights/${article.slug}` },
    robots: article.indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      ...(article.hero_image_url ? { images: [article.hero_image_url] } : {}),
    },
  };
}

export default async function InsightsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  await recordPageEvent("page_view", "article", { articleId: article.id });

  // Related listings so every article funnels readers to live inventory.
  let related: RelatedProject[] = [];
  if (article.related_project_ids.length) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("public_projects_view")
      .select("slug, project_name, city, hero_image_url, price_from_public")
      .in("project_id", article.related_project_ids.slice(0, 6));
    related = ((data as RelatedProject[] | null) ?? []).filter((p) => p.slug);
  }

  const typeLabel =
    ARTICLE_TYPES.find((t) => t.value === article.article_type)?.label ??
    "Guide";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description:
      article.excerpt ?? markdownToPlainText(article.body_md, 160),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(article.hero_image_url ? { image: article.hero_image_url } : {}),
    mainEntityOfPage: `${SITE_URL}/insights/${article.slug}`,
    author: { "@type": "Organization", name: "LIQWD", url: SITE_URL },
    publisher: { "@type": "Organization", name: "LIQWD", url: SITE_URL },
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-slate-400">
        <Link href="/insights" className="hover:text-slate-600">
          Insights
        </Link>{" "}
        / <span>{typeLabel}</span>
      </nav>

      <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-ink">
        {article.title}
      </h1>
      {article.published_at ? (
        <p className="mt-3 text-sm text-slate-400">
          {new Date(article.published_at).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · by the LIQWD team
        </p>
      ) : null}

      {article.hero_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.hero_image_url}
          alt=""
          className="mt-6 w-full rounded-2xl object-cover"
        />
      ) : null}

      <div
        // Safe by construction: renderMarkdown escapes ALL input before
        // emitting its own fixed set of tags — no raw HTML can pass through.
        dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body_md) }}
      />

      {related.length > 0 ? (
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-semibold text-ink">
            Projects in this article
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                {p.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.hero_image_url}
                    alt=""
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="size-16 shrink-0 rounded-lg bg-slate-100" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink group-hover:text-brand-700">
                    {p.project_name}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {p.city ?? ""}
                    {p.price_from_public
                      ? `${p.city ? " · " : ""}from $${Math.round(p.price_from_public).toLocaleString("en-CA")}`
                      : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-10 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        {["project_spotlight", "neighbourhood_guide", "comparison"].includes(
          article.article_type,
        )
          ? "Facts in this article come from the project listings LIQWD tracks and were accurate when published. Pricing, availability, and timelines for pre-construction homes change — always confirm details on the live listing or with the sales team before making decisions."
          : "This article was accurate to the cited sources when published and is provided for information only — it isn't advice. Details change; verify anything you plan to act on at the original source."}
      </p>
    </article>
  );
}
