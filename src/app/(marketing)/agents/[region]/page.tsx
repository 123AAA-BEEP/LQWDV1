import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import {
  REGIONS,
  REGION_KEYS,
  regionFromSlug,
  regionSlug,
} from "@/lib/regions";

export const dynamic = "force-dynamic";

/**
 * Crawlable per-market landing pages for agents — /agents/ontario,
 * /agents/british-columbia, /agents/alberta, /agents/florida. These exist to
 * RANK for "{market} new construction leads for realtors"-type searches (the
 * geo-adaptive homepage only helps visitors who already arrived), and to give
 * outreach campaigns a market-true destination link.
 */
export function generateStaticParams() {
  return REGION_KEYS.map((k) => ({ region: regionSlug(k) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region: slug } = await params;
  const region = regionFromSlug(slug);
  if (!region) return { title: "Market not found" };
  return {
    title: `Free New-Home Buyer Leads for ${region.label} Realtors`,
    description: `LIQWD routes buyer inquiries from ${region.voice.marketLine} project pages to verified agents — free, from your current brokerage. ${region.regulator.shortName} verification.`,
    alternates: { canonical: `/agents/${slug}` },
  };
}

interface MiniProject {
  slug: string;
  project_name: string;
  city: string | null;
}

export default async function RegionAgentsPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region: slug } = await params;
  const region = regionFromSlug(slug);
  if (!region) notFound();

  // Live proof + crawlable internal links into this market's newest pages.
  const supabase = await createClient();
  const provinceOr = region.provinceValues
    .map((v) => `province.ilike.${v}`)
    .join(",");
  const [{ data: newest }, { count }] = await Promise.all([
    supabase
      .from("public_projects_view")
      .select("slug, project_name, city")
      .or(provinceOr)
      .order("published_at", { ascending: false })
      .limit(6),
    supabase
      .from("public_projects_view")
      .select("project_id", { count: "exact", head: true })
      .or(provinceOr),
  ]);
  const projects = ((newest ?? []) as MiniProject[]);
  const projectCount = count ?? 0;

  const steps = [
    {
      title: "Verify once, free",
      body: `Create your account and verify your ${region.regulator.shortName} licence — usually same-day, often instant.`,
    },
    {
      title: "Claim project pages",
      body: `Add or update ${region.voice.marketLine} projects to become the agent on their public pages.`,
    },
    {
      title: "Receive buyer inquiries",
      body: "Buyers registering on your pages route straight to you — no referral fees, no brokerage change.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
      {/* Hero */}
      <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        <span aria-hidden className="h-px w-8 bg-brand-500" />
        {region.voice.audienceLine}
      </p>
      <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
        Free new-home buyer leads for {region.label} realtors
      </h1>
      <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600">
        LIQWD builds the public page for every new development — then routes
        its buyer inquiries to the verified agent who claims it. Free, from
        your current brokerage.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <ButtonLink href="/signup" size="lg" className="px-8">
          Sign up free
        </ButtonLink>
        <Link
          href={`/projects?region=${region.key}`}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Browse {projectCount > 0 ? `${projectCount} ` : ""}
          {region.label} project{projectCount === 1 ? "" : "s"} →
        </Link>
      </div>
      <p className="mt-4 text-sm text-slate-500">{region.voice.microcopy}</p>

      {/* How it works */}
      <section className="mt-16">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          How it works in {region.label}
        </h2>
        <ol className="mt-5 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          Verification is checked against{" "}
          <a
            href={region.regulator.registerUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-700"
          >
            {region.regulator.name}
          </a>
          &apos;s public register.
        </p>
      </section>

      {/* Newest local pages — live proof + internal-link mesh */}
      {projects.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Just added in {region.label}
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="block rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:border-brand-300 hover:text-brand-800"
                >
                  {p.project_name}
                  {p.city ? (
                    <span className="font-normal text-slate-500"> · {p.city}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Cross-links to the other markets (crawl mesh) */}
      <p className="mt-16 border-t border-slate-200 pt-6 text-sm text-slate-500">
        Also on LIQWD:{" "}
        {REGION_KEYS.filter((k) => k !== region.key).map((k, i, arr) => (
          <span key={k}>
            <Link
              href={`/agents/${regionSlug(k)}`}
              className="font-medium text-brand-700 hover:underline"
            >
              {REGIONS[k].label}
            </Link>
            {i < arr.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>
    </div>
  );
}
