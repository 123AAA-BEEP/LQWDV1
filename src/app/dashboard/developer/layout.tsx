import { requireUserProfile, isDeveloper } from "@/lib/auth";
import { NoAccess } from "@/components/admin/no-access";

export const dynamic = "force-dynamic";

export default async function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUserProfile();

  if (!isDeveloper(profile)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Developer console
        </h1>
        <NoAccess title="Developer access required">
          The developer console is for paying developer accounts. Contact LIQWD
          to have your account enabled to list deals.
        </NoAccess>
      </div>
    );
  }

  return <>{children}</>;
}
