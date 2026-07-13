import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { claimProspect } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Claim your page",
  robots: { index: false, follow: false },
};

/**
 * The claim handoff for a pre-minted prospect page. Logged out: route through
 * signup with ?next back here (the account IS step one of claiming). Logged
 * in: one confirm button — the claim action does the rest.
 */

interface ProspectRow {
  id: string;
  slug: string;
  first_name: string | null;
  last_name: string | null;
  brokerage: string | null;
  city: string | null;
  claimed_by_profile_id: string | null;
}

export default async function ClaimProspectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_pages")
    .select(
      "id, slug, first_name, last_name, brokerage, city, claimed_by_profile_id",
    )
    .eq("slug", slug)
    .maybeSingle();
  const prospect = (data as ProspectRow) ?? null;
  if (!prospect) notFound();

  const name =
    [prospect.first_name, prospect.last_name].filter(Boolean).join(" ") ||
    "this agent";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const claimUrl = `/realtors/${slug}/claim`;

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
          <BadgeCheck aria-hidden className="size-5 text-brand-600" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Claim {name}&apos;s page
          </h1>
          <p className="text-sm text-slate-500">
            {[prospect.brokerage, prospect.city].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {error ? (
        <Notice tone="error" className="mt-6">
          {error}
        </Notice>
      ) : null}

      {prospect.claimed_by_profile_id ? (
        <Notice tone="info" className="mt-6">
          This page has already been claimed. If that was you, head to{" "}
          <Link href="/dashboard/my-page" className="font-medium underline">
            your dashboard
          </Link>
          .
        </Notice>
      ) : user ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm leading-relaxed text-slate-600">
            Claiming makes this page yours: your photo, banner, awards, your
            own links, and the projects you sell. Buyer inquiries on your
            projects route directly to you. Your licence is verified with your
            RECO number right after — the page publishes once that&apos;s
            confirmed.
          </p>
          <form action={claimProspect} className="mt-5">
            <input type="hidden" name="slug" value={prospect.slug} />
            <SubmitButton className="w-full" pendingLabel="Claiming…">
              <ShieldCheck aria-hidden className="mr-1.5 size-4" /> Claim this
              page
            </SubmitButton>
          </form>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm leading-relaxed text-slate-600">
            Claiming takes two steps: create your free account, then verify
            with your RECO number. You&apos;ll come straight back here — about
            two minutes end to end.
          </p>
          <Link
            href={`/signup?next=${encodeURIComponent(claimUrl)}`}
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Create my free account
          </Link>
          <p className="mt-3 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(claimUrl)}`}
              className="font-medium text-brand-700 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Not {name}, or want this page removed? Email{" "}
        <a href="mailto:hello@liqwd.ca" className="underline">
          hello@liqwd.ca
        </a>{" "}
        and it comes down the same day.
      </p>
    </div>
  );
}
