import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Download, Megaphone } from "lucide-react";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { CopyField } from "@/components/ui/copy-field";
import { VerificationRequired } from "@/components/dashboard/locked";
import { formatPriceBand } from "@/lib/types";

export const metadata: Metadata = { title: "Promote with ads" };
export const dynamic = "force-dynamic";

interface ProjRow {
  project_id: string;
  slug: string;
  project_name: string;
  city: string | null;
  project_type: string | null;
  price_from_public: number | null;
}

/**
 * Deterministic Meta ad copy — three angles, composed from public-safe
 * project fields. No demographic language anywhere (Housing special-category
 * rules), no income/guarantee claims (brand guardrails).
 */
function copyVariants(p: ProjRow, agentFirst: string) {
  const from = formatPriceBand(p.price_from_public, null);
  const where = p.city ? ` in ${p.city}` : "";
  return [
    {
      angle: "Value-first",
      primary:
        `Now selling: ${p.project_name}${where}.` +
        (from ? ` New-construction homes ${from.toLowerCase()}.` : "") +
        " Get the price list, floor plans and current incentives before they hit the public. Tap to request your buyer's package — free.",
      headline: from
        ? `${p.project_name} — ${from}`
        : `${p.project_name}${where}`,
      description: "Price list, floor plans & incentives",
    },
    {
      angle: "Early access",
      primary:
        `${p.city ? `${p.city} buyers — ` : ""}${p.project_name} is moving.` +
        " First access to pricing, floor plans and availability, direct from a verified new-construction agent. Request the details today.",
      headline: `First access: ${p.project_name}`,
      description: "Direct from a verified pre-con agent",
    },
    {
      angle: "Agent-personal",
      primary:
        `Thinking about a brand-new home${where}? I'm ${agentFirst}, a verified pre-construction agent.` +
        ` Ask me for my full buyer's package for ${p.project_name} — floor plans, deposit structure and incentives, no cost and no pressure.`,
      headline: `${p.project_name}${where}`,
      description: "Get the full buyer's package — free",
    },
  ];
}

export default async function PromoteProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { profile } = await requireUserProfile();

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <Header name={null} />
        <VerificationRequired />
      </div>
    );
  }

  // Promotable = live on the public site (an ad pointing at a 404 burns money).
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("project_id, slug, project_name, city, project_type, price_from_public")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();
  const project = data as ProjRow;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "liqwd.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = `${proto}://${host}`;
  const code = profile.referral_code;
  const destination =
    `${base}/projects/${project.slug}` +
    `?${code ? `ref=${code}&` : ""}utm_source=facebook&utm_medium=paid&utm_campaign=promote-${project.slug}`;

  const variants = copyVariants(project, profile.first_name || "a LIQWD agent");
  const imgBase = `/dashboard/projects/${project.slug}/promote/ad-image`;

  return (
    <div className="max-w-3xl space-y-8">
      <Header name={project.project_name} />

      <Notice tone="info">
        <span className="font-semibold">How this works:</span> you run the ad
        from your own Meta account and control every dollar of spend. The ad
        links to this project&apos;s public page with{" "}
        <span className="font-medium">your attribution baked in</span> — every
        lead it captures routes to{" "}
        <Link href="/dashboard/leads" className="font-medium underline">
          your Leads inbox
        </Link>
        , no referral fee.
      </Notice>

      {/* 1 — Creative */}
      <section className="space-y-3">
        <StepHeading n={1} title="Download your ad creative" />
        <p className="text-sm text-slate-500">
          Generated from the project&apos;s hero with your name and brokerage
          stamped on — TRESA-compliant advertising out of the box.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              { format: "square", label: "Feed square · 1080×1080" },
              { format: "landscape", label: "Link ad · 1200×628" },
            ] as const
          ).map((v) => (
            <Card key={v.format}>
              <CardBody className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${imgBase}?format=${v.format}`}
                  alt={`${project.project_name} ad creative (${v.label})`}
                  className="w-full rounded-lg border border-slate-200"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">{v.label}</p>
                  <a
                    href={`${imgBase}?format=${v.format}`}
                    download={`${project.slug}-ad-${v.format}.png`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 hover:bg-slate-50"
                  >
                    <Download className="size-3.5" aria-hidden /> Download PNG
                  </a>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* 2 — Copy */}
      <section className="space-y-3">
        <StepHeading n={2} title="Pick your ad copy" />
        <div className="space-y-3">
          {variants.map((v) => (
            <Card key={v.angle}>
              <CardBody className="space-y-3">
                <Badge tone="neutral">{v.angle}</Badge>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Primary text
                  </p>
                  <div className="mt-1">
                    <CopyField value={v.primary} size="sm" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Headline
                    </p>
                    <div className="mt-1">
                      <CopyField value={v.headline} size="sm" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Description
                    </p>
                    <div className="mt-1">
                      <CopyField value={v.description} size="sm" />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* 3 — Destination */}
      <section className="space-y-3">
        <StepHeading n={3} title="Your destination link" />
        <p className="text-sm text-slate-500">
          Paste this as the ad&apos;s website URL. It carries your referral code
          (leads attribute to you) and campaign tags so your Lead Pages
          analytics show what the ad did.
        </p>
        <CopyField value={destination} size="sm" />
        {!code ? (
          <Notice tone="warning">
            Your referral code is still being generated — refresh in a moment
            so the link attributes leads to you before you launch.
          </Notice>
        ) : null}
      </section>

      {/* 4 — Launch checklist */}
      <section className="space-y-3">
        <StepHeading n={4} title="Launch in Ads Manager" />
        <Card>
          <CardBody>
            <ol className="list-decimal space-y-2.5 pl-5 text-sm text-slate-600">
              <li>
                In Meta Ads Manager, create a new campaign with the{" "}
                <span className="font-medium">Leads</span> or{" "}
                <span className="font-medium">Traffic</span> objective.
              </li>
              <li>
                <span className="font-semibold text-slate-800">
                  Declare the Housing special ad category
                </span>{" "}
                — Meta requires it for every real-estate ad. Skipping it gets
                the ad rejected (or worse, your account flagged).
              </li>
              <li>
                Audience: your city plus surrounding area — Housing ads
                enforce a wide radius (roughly 25&nbsp;km) and no demographic
                targeting, so keep it broad and let the creative qualify the
                clicker.
              </li>
              <li>
                Upload the creative, paste the copy and the destination link
                from above.
              </li>
              <li>
                Budget: $10–20/day for 7–14 days is a sensible first test.
                Watch results in{" "}
                <Link
                  href="/dashboard/lead-pages"
                  className="font-medium text-brand-700 hover:underline"
                >
                  Lead Pages
                </Link>{" "}
                (link views) and{" "}
                <Link
                  href="/dashboard/leads"
                  className="font-medium text-brand-700 hover:underline"
                >
                  Leads
                </Link>{" "}
                (the actual buyers).
              </li>
            </ol>
          </CardBody>
        </Card>
      </section>

      <p className="text-xs leading-relaxed text-slate-400">
        You&apos;re the advertiser: spend, delivery, and results are controlled
        in your Meta account, and ad performance varies. Check your
        brokerage&apos;s advertising policy before running paid ads — the
        creative already carries your name and brokerage as TRESA expects.
      </p>
    </div>
  );
}

function Header({ name }: { name: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
        <Megaphone className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Promote{name ? ` ${name}` : " this project"}
        </h1>
        <p className="mt-1 max-w-xl text-slate-500">
          A ready-to-run Meta ad kit: creative, copy, and your attributed
          link. You control the spend; the leads come back to you.
        </p>
      </div>
    </div>
  );
}

function StepHeading({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-base font-semibold text-ink">
      <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
        {n}
      </span>
      {title}
    </h2>
  );
}
