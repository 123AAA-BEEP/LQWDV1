import { requireUserProfile, isAdmin, isUltra } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { VerificationBanner } from "@/components/dashboard/verification-banner";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { UltraBadge } from "@/components/dashboard/ultra";
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
  const ultra = isUltra(profile);

  return (
    <div className="flex min-h-full">
      <Sidebar
        name={name}
        email={email}
        avatarUrl={profile.avatar_url}
        isAdmin={isAdmin(profile)}
        isUltra={ultra}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
        {/* Slim context bar — membership state is always visible. */}
        <div className="flex h-16 items-center justify-end gap-2 border-b border-slate-200 bg-white px-6">
          {ultra ? (
            <UltraBadge />
          ) : (
            <span className="text-xs font-medium text-slate-400">
              Free plan
            </span>
          )}
          <Badge tone={verificationBadgeTone(profile.verification_status)}>
            {VERIFICATION_LABELS[profile.verification_status]}
          </Badge>
        </div>
        <div className="flex-1">
          <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
            <VerificationBanner status={profile.verification_status} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
