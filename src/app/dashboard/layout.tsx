import {
  requireUserProfile,
  isAdmin,
  isPro,
  isUltra,
  isDeveloper,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SignupConversion } from "@/components/dashboard/signup-conversion";
import { VerificationBannerGate } from "@/components/dashboard/verification-banner-gate";
import { RecoExpiryBanner } from "@/components/dashboard/reco-expiry-banner";
import { ToastProvider } from "@/components/ui/toast";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { ProBadge, UltraBadge } from "@/components/dashboard/tier-ui";
import { VERIFICATION_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, email } = await requireUserProfile();
  const name =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.display_name ||
    "Your account";
  const pro = isPro(profile);
  const ultra = isUltra(profile);
  const developer = isDeveloper(profile);

  // The rail's one numeric badge: drafts waiting on THIS user's approval
  // (RLS: realtors read their own subject rows; admins see their own here
  // too — the all-agents queue lives in the admin console).
  let approvalsPending = 0;
  if (!developer) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("approval_items")
      .select("id", { count: "exact", head: true })
      .eq("subject_kind", "realtor")
      .eq("subject_id", profile.id)
      .in("status", ["staged", "triaged"]);
    approvalsPending = count ?? 0;
  }

  // Google Ads signup conversion — once per account, only for accounts created
  // in the last 3 days (so switching the tag on never fires for the backlog),
  // and only when the Ads id + label are configured (campaign plan §6).
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";
  const adsLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL ?? "";
  const conv = profile as { signup_conversion_fired_at?: string | null; created_at: string };
  // eslint-disable-next-line react-hooks/purity -- async Server Component, runs per request.
  const isNew = Date.now() - new Date(conv.created_at).getTime() < 3 * 24 * 60 * 60 * 1000;
  const conversionSendTo =
    !developer && adsId && adsLabel && conv.signup_conversion_fired_at == null && isNew
      ? `${adsId}/${adsLabel}`
      : null;

  // Plan / role + verification chips — shown in the desktop context bar and,
  // on mobile, handed to the Sidebar's top bar.
  const planBadge = developer ? (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      Developer
    </span>
  ) : ultra ? (
    <UltraBadge />
  ) : pro ? (
    <ProBadge />
  ) : (
    <span className="text-xs font-medium text-slate-400">Free plan</span>
  );
  const statusBadge = developer ? null : (
    <Badge tone={verificationBadgeTone(profile.verification_status)}>
      {VERIFICATION_LABELS[profile.verification_status]}
    </Badge>
  );

  return (
    <ToastProvider>
    {conversionSendTo ? (
      <SignupConversion sendTo={conversionSendTo} transactionId={profile.id} />
    ) : null}
    <div className="flex min-h-full flex-col lg:flex-row">
      <Sidebar
        name={name}
        email={email}
        avatarUrl={profile.avatar_url}
        isAdmin={isAdmin(profile)}
        isPro={pro}
        isUltra={ultra}
        isDeveloper={developer}
        planBadge={planBadge}
        statusBadge={statusBadge}
        approvalsPending={approvalsPending}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
        {/* Slim context bar — role / plan state. Desktop only; on mobile these
            chips live in the Sidebar's top bar. */}
        <div className="hidden h-16 items-center justify-end gap-2 border-b border-slate-200 bg-white px-6 lg:flex">
          {planBadge}
          {statusBadge}
        </div>
        <div className="flex-1">
          <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
            {developer ? null : (
              <>
                <VerificationBannerGate status={profile.verification_status} />
                <RecoExpiryBanner expiry={profile.reco_expiry} />
              </>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
    </ToastProvider>
  );
}
