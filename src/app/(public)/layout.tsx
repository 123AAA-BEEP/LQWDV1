import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { AgentFollowStrip } from "@/components/public/agent-follow-strip";

/** Consumer marketplace layout — distinct chrome from the agent landing. */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="display-type flex min-h-full flex-col">
      <PublicHeader />
      {/* "You're browsing with {agent}" — shown site-wide while an agent's
          referral cookie is active. Client-side so static pages stay static. */}
      <AgentFollowStrip />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
