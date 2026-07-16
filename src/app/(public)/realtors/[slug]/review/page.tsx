import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { AgentReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

interface CardRow {
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  brokerage: string | null;
  avatar_url: string | null;
  service_area: string | null;
}

async function getAgent(slug: string): Promise<CardRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_realtor_cards")
    .select(
      "profile_id, first_name, last_name, brokerage, avatar_url, service_area",
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as CardRow) ?? null;
}

function fullName(a: CardRow): string {
  return [a.first_name, a.last_name].filter(Boolean).join(" ") || "LIQWD Agent";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgent(slug);
  const name = agent ? fullName(agent) : "Agent";
  return {
    title: `Review ${name} | LIQWD`,
    description: `Worked with ${name}? Leave a verified client review on their LIQWD profile.`,
    robots: { index: false },
  };
}

export default async function ReviewAgentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();
  const name = fullName(agent);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Link
        href={`/realtors/${slug}`}
        className="text-sm text-brand-700 hover:underline"
      >
        ← Back to {name}&apos;s profile
      </Link>

      <div className="mt-4 flex items-center gap-4">
        {agent.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.avatar_url}
            alt=""
            className="size-14 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800">
            {name[0]}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Review {name}
          </h1>
          <p className="text-sm text-slate-500">
            {[agent.brokerage, agent.service_area].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-sm text-slate-500">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-emerald-600"
          aria-hidden
        />
        Every review is verified by LIQWD before it&apos;s published — your
        honest experience helps other buyers choose with confidence.
      </p>

      <Card className="mt-6">
        <CardBody>
          <AgentReviewForm
            profileId={agent.profile_id}
            firstName={agent.first_name || name}
          />
        </CardBody>
      </Card>
    </div>
  );
}
