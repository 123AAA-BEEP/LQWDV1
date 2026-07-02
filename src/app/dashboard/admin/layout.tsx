import { requireUserProfile, isAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminQueueCounts } from "@/lib/admin-counts";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUserProfile();

  if (!isAdmin(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Admin</h1>
        <NoAccess />
      </div>
    );
  }

  // Live pending counts on every tab so admins see where work is waiting
  // without opening each queue. Head-only count queries, run in parallel.
  const counts = await getAdminQueueCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Admin console
        </h1>
        <p className="mt-1 text-slate-500">
          Review verifications, submissions, and updates. Manage and publish
          projects.
        </p>
      </div>
      <AdminNav counts={counts} />
      {children}
    </div>
  );
}
