import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hasActivePro } from "@/lib/types";
import { REWARD_DAYS } from "@/lib/rewards";
import { CopyLink } from "./copy-link";

export const metadata: Metadata = { title: "Refer & earn" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ReferPage() {
  const { profile } = await requireUserProfile();
  const supabase = await createClient();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "liqwd.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const inviteUrl = profile.referral_code
    ? `${proto}://${host}/signup?ref=${profile.referral_code}`
    : "";

  // Referrals I've made (RLS lets me read my own).
  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, status, created_at, qualified_at")
    .eq("referrer_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const total = referrals?.length ?? 0;
  const qualified =
    referrals?.filter((r) => r.status === "qualified").length ?? 0;

  // My total rewarded days (across every reward type).
  const { data: ledger } = await supabase
    .from("rewards_ledger")
    .select("days_granted")
    .eq("profile_id", profile.id);
  const totalDays =
    ledger?.reduce((sum, r) => sum + (r.days_granted ?? 0), 0) ?? 0;

  const proActive = hasActivePro(profile);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Refer &amp; earn
        </h1>
        <p className="mt-1 text-slate-500">
          Invite Ontario realtors you trust. When they join, you{" "}
          <span className="font-medium text-slate-700">both</span> earn{" "}
          {REWARD_DAYS.referral_signup} days of LIQWD Pro — plus a{" "}
          {REWARD_DAYS.referral_verified}-day bonus each once they&apos;re RECO
          verified.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Realtors referred" value={String(total)} />
        <Stat label="Verified" value={String(qualified)} />
        <Stat label="Pro days earned" value={String(totalDays)} />
      </div>

      {/* Pro status */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Your LIQWD Pro</h2>
            <p className="mt-1 text-sm text-slate-500">
              {profile.pro_until
                ? proActive
                  ? `Active through ${formatDate(profile.pro_until)}.`
                  : `Expired ${formatDate(profile.pro_until)}.`
                : "Earn Pro time by referring realtors and contributing project data."}
            </p>
          </div>
          <Badge tone={proActive ? "success" : "neutral"}>
            {proActive ? "Pro active" : "No active Pro"}
          </Badge>
        </CardBody>
      </Card>

      {/* Invite link */}
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink">Your invite link</h2>
          <p className="mt-1 text-sm text-slate-500">
            Share this link or your code{" "}
            <span className="font-mono font-medium text-slate-700">
              {profile.referral_code}
            </span>
            . Rewards are credited automatically when an invited realtor confirms
            their account.
          </p>
          <div className="mt-4">
            {inviteUrl ? (
              <CopyLink url={inviteUrl} />
            ) : (
              <p className="text-sm text-slate-400">
                Your invite link is being generated — refresh in a moment.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Referral history */}
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink">Your referrals</h2>
          {total === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No referrals yet. Share your link above to get started.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {referrals!.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="text-slate-600">
                    Joined {formatDate(r.created_at)}
                  </span>
                  <Badge tone={r.status === "qualified" ? "success" : "warning"}>
                    {r.status === "qualified" ? "Verified" : "Signed up"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-2xl font-semibold text-ink">{value}</p>
        <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      </CardBody>
    </Card>
  );
}
