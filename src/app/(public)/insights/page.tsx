import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { ARTICLE_TYPES } from "@/lib/articles";
import { markdownToPlainText } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Insights — New-Construction Guides & Market Notes",
  description:
    "Guides, project spotlights, and market notes on pre-construction homes across Ontario — grounded in the live listing data LIQWD tracks.",
  alternates: { canonical: "/insights" },
};
export const dynamic = "force-dynamic";

interface ArticleCard {
  slug: string;
  article_type: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  hero_image_url: string | null;
  published_at: string | null;
}

export default async function InsightsIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_articles_view")
    .select("slug, article_type, title, excerpt, body_md, hero_image_url, published_at")
    .order("published_at", { ascending: false })
    .limit(60);
  const articles = (data as ArticleCard[] | null) ?? [];

  const typeLabel = (v: string) =>
    ARTICLE_TYPES.find((t) => t.value === v)?.label ?? "Guide";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink">
        Insights
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        Guides, spotlights, and market notes on new-construction homes — every
        fact drawn from the live listings we track, and every piece reviewed
        before it&apos;s published.
      </p>

      {articles.length === 0 ? (
        <Card className="mt-10">
          <CardBody className="py-10 text-center text-slate-500">
            First articles are on the way — meanwhile,{" "}
            <Link href="/projects" className="text-brand-700 hover:underline">
              browse the live listings
            </Link>
            .
          </CardBody>
        </Card>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {articles.map((a) => (
            <Link key={a.slug} href={`/insights/${a.slug}`} className="group block h-full">
              <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                {a.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.hero_image_url}
                    alt=""
                    className="h-40 w-full object-cover"
                  />
                ) : null}
                <CardBody>
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                    {typeLabel(a.article_type)}
                  </p>
                  <h2 className="mt-2 font-semibold text-ink">{a.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {a.excerpt ?? markdownToPlainText(a.body_md, 160)}
                  </p>
                  {a.published_at ? (
                    <p className="mt-3 text-xs text-slate-400">
                      {new Date(a.published_at).toLocaleDateString("en-CA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  ) : null}
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
