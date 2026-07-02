import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { ListingCard } from "@/components/dashboard/off-market/listing-card";
import { cn } from "@/lib/cn";
import { claimUrlFor } from "@/lib/off-market";
import type { OffMarketListing } from "@/lib/types";

export const metadata: Metadata = { title: "Off-Market" };
export const dynamic = "force-dynamic";

const KINDS = [
  { value: "", label: "All" },
  { value: "have", label: "Have" },
  { value: "want", label: "Wanted" },
  { value: "service", label: "Services" },
] as const;

export default async function OffMarketPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    kind?: string;
    q?: string;
    view?: string;
  }>;
}) {
  const { userId, profile } = await requireUserProfile();

  // Approved realtors and admins (the owner) can browse + post; admins can
  // also edit/remove any listing to moderate + seed. Developers/public are
  // blocked (RLS enforces the same).
  const canPost = isAdmin(profile) || (profile.role === "realtor" && isApproved(profile));
  const canView = canPost;
  if (!canView) {
    // Unverified agents can't browse the board, but if they CLAIMED a listing
    // they must see it's safely reserved (owners read own rows via RLS).
    const supabaseGated = await createClient();
    const { data: heldData } = await supabaseGated
      .from("off_market_listings")
      .select("id, title")
      .eq("claimed_by_profile_id", userId)
      .eq("status", "pending_claim");
    const held = (heldData ?? []) as { id: string; title: string }[];

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Off-Market
        </h1>
        {held.length > 0 ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">
              Your claimed listing{held.length > 1 ? "s are" : " is"} reserved
              under your name
            </p>
            <p className="mt-0.5 text-sm text-brand-700">
              {held.map((h) => h.title).join(" · ")}
            </p>
            <p className="mt-1.5 text-sm text-brand-700">
              {held.length > 1 ? "They go" : "It goes"} live the moment your
              verification is approved —{" "}
              <Link
                href="/dashboard/verify"
                className="font-semibold underline"
              >
                finish verification
              </Link>
              .
            </p>
          </div>
        ) : null}
        <VerificationRequired />
      </div>
    );
  }

  const admin = isAdmin(profile);
  const {
    created,
    updated,
    deleted,
    kind: rawKind,
    q: rawQ,
    view: rawView,
  } = await searchParams;
  const kind = ["have", "want", "service"].includes(rawKind ?? "")
    ? (rawKind as string)
    : "";
  const q = (rawQ ?? "").trim();
  // Admin-only "Pending claims" view: the sourced placeholders that aren't live
  // yet, each with a claim link to send to the listing agent.
  const pendingView = admin && rawView === "pending";

  const supabase = await createClient();

  // Kind-chip counts reflect what the network sees: published listings only.
  const { data: kindRows } = await supabase
    .from("off_market_listings")
    .select("post_kind")
    .eq("status", "published");
  const counts = { all: 0, have: 0, want: 0, service: 0 };
  for (const r of (kindRows ?? []) as { post_kind: string | null }[]) {
    counts.all += 1;
    if (r.post_kind === "want") counts.want += 1;
    else if (r.post_kind === "service") counts.service += 1;
    else counts.have += 1; // 'have' or null (native posts)
  }

  // Admin: how many sourced placeholders are still unclaimed (need a link sent).
  let pendingCount = 0;
  if (admin) {
    const { count } = await supabase
      .from("off_market_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_claim")
      .is("claimed_by_profile_id", null);
    pendingCount = count ?? 0;
  }

  let req = supabase
    .from("off_market_listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (pendingView) {
    req = req.eq("status", "pending_claim").is("claimed_by_profile_id", null);
  } else {
    req = req.eq("status", "published");
    if (kind === "have") req = req.or("post_kind.eq.have,post_kind.is.null");
    else if (kind) req = req.eq("post_kind", kind);
  }
  if (q) req = req.ilike("title", `%${q}%`);

  const { data } = await req;
  const listings = (data as OffMarketListing[] | null) ?? [];

  const chipHref = (k: string) => {
    const p = new URLSearchParams();
    if (k) p.set("kind", k);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/dashboard/off-market?${s}` : "/dashboard/off-market";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Off-Market
          </h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            A private board for verified agents to share and find off-market
            deals, plus buyer Wants. Browse, then reach out directly to co-broke.
            Visible only to verified LIQWD realtors.
          </p>
        </div>
        {canPost ? (
          <ButtonLink href="/dashboard/off-market/new">Post a listing</ButtonLink>
        ) : null}
      </div>

      {created ? (
        <Notice tone="success">Your listing is live on the board.</Notice>
      ) : null}
      {updated ? <Notice tone="success">Listing updated.</Notice> : null}
      {deleted ? <Notice tone="success">Listing removed.</Notice> : null}

      {/* Admin: toggle between the live board and pending claims. */}
      {admin ? (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/dashboard/off-market"
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              !pendingView
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            Live board
            <span className={cn("ml-1.5", !pendingView ? "text-white/80" : "text-slate-400")}>
              {counts.all}
            </span>
          </Link>
          <Link
            href="/dashboard/off-market?view=pending"
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              pendingView
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            Pending claims
            <span className={cn("ml-1.5", pendingView ? "text-white/80" : "text-slate-400")}>
              {pendingCount}
            </span>
          </Link>
        </div>
      ) : null}

      {pendingView ? (
        <Notice tone="info">
          These sourced listings are hidden from the network. Send each agent
          their claim link — when they sign up and claim it, the listing goes
          live under their name.
        </Notice>
      ) : null}

      {/* Filters: kind chips + title search (live board only) */}
      {!pendingView ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => {
              const active = kind === k.value;
              const count =
                k.value === "" ? counts.all : counts[k.value as keyof typeof counts];
              return (
                <Link
                  key={k.value || "all"}
                  href={chipHref(k.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  {k.label}
                  <span className={cn("ml-1.5", active ? "text-white/80" : "text-slate-400")}>
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
          <form method="get" className="flex flex-1 gap-2 sm:max-w-xs">
            {kind ? <input type="hidden" name="kind" value={kind} /> : null}
            <Input name="q" placeholder="Search…" defaultValue={q} className="flex-1" />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </div>
      ) : (
        <form method="get" className="flex gap-2 sm:max-w-xs">
          <input type="hidden" name="view" value="pending" />
          <Input name="q" placeholder="Search…" defaultValue={q} className="flex-1" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      )}

      {listings.length === 0 ? (
        <Card>
          <CardBody className="space-y-3 py-10 text-center">
            <p className="text-sm text-slate-500">
              {pendingView
                ? "No pending claims."
                : q || kind
                  ? "No posts match your filters."
                  : "No off-market listings yet."}
            </p>
            {canPost && !pendingView ? (
              <div>
                <ButtonLink href="/dashboard/off-market/new" size="sm">
                  Post a listing
                </ButtonLink>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              isOwner={l.realtor_id === userId}
              canEdit={l.realtor_id === userId || admin}
              claimUrl={
                pendingView && l.claim_token ? claimUrlFor(l.claim_token) : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
