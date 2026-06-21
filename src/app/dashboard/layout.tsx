import {
  requireUserProfile,
  isAdmin,
  isPro,
  isUltra,
  isDeveloper,
} from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { VerificationBanner } from "@/components/dashboard/verification-banner";
import { RecoExpiryBanner } from "@/components/dashboard/reco-expiry-banner";
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
                <VerificationBanner status={profile.verification_status} />
                <RecoExpiryBanner expiry={profile.reco_expiry} />
              </>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
