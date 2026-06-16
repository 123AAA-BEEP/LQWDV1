import { requireUserProfile, isAdmin, isDeveloper } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { VerificationBanner } from "@/components/dashboard/verification-banner";
import { unreadNotificationCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, email } = await requireUserProfile();
  const unreadCount = await unreadNotificationCount();
  const name =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.display_name ||
    "Your account";

  return (
    <div className="flex min-h-full">
      <Sidebar
        name={name}
        email={email}
        isAdmin={isAdmin(profile)}
        isDeveloper={isDeveloper(profile)}
        unreadCount={unreadCount}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
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
