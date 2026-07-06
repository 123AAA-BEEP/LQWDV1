import type { Metadata } from "next";
import { AgentPitchPage, type PitchConfig } from "@/components/marketing/agent-pitch-page";

export const metadata: Metadata = {
  title: "Know What's Coming Before It Launches — For Agents",
  description:
    "LIQWD tracks planning applications, architect portfolios, and builder pipelines — so agents see new developments at the planning stage, before marketing exists.",
  alternates: { canonical: "/agents/early-access" },
};

const PITCH: PitchConfig = {
  eyebrow: "For real estate agents",
  headline: "Know what's coming",
  accent: "before it launches.",
  sub: "LIQWD's discovery engine watches planning applications, architect portfolios, and builder pipelines every day — so the projects in your farm area show up here at the planning stage, months before a sales centre opens.",
  proof: [
    "Planning-stage pipeline",
    "Updated daily",
    "Free for verified agents",
  ],
  sections: [
    {
      title: "The earliest signal in the market",
      body: "A development application, a rezoning, a new page on an architect's site — that's where projects begin, long before marketing. LIQWD cross-references those sources continuously and turns them into project pages the moment they're verifiable.",
      bullets: [
        "Municipal development applications, tracked weekly",
        "Developer and architect portfolios, swept for new work",
        "Industry databases and news, cross-referenced daily",
      ],
    },
    {
      title: "Walk into conversations first",
      body: "When a buyer asks what's coming to their neighbourhood — or a seller wonders what that hoarding down the street is — you already know: the builder, the address, the scale, the stage. That's the kind of local authority that wins clients.",
      bullets: [
        "Projects listed at Planning & Approval, Presales, and Construction",
        "Builder, address, and stage on every page",
        "Follow your market, from Toronto to Miami",
      ],
    },
    {
      title: "Be positioned when it goes to market",
      body: "Verified agents can be matched to a project's public page and receive the buyer inquiries it generates when interest picks up. Early knowledge plus early positioning — that's the compounding advantage.",
      bullets: [
        "No referral fees, no brokerage change",
        "Licence-verified professionals only",
        "Matching and inquiries depend on page interest — no volume promises",
      ],
    },
  ],
  cta: {
    heading: "See your market's pipeline today.",
    body: "Sign up free, verify your licence, and browse what's coming to your area before anyone's marketing it.",
  },
};

export default function EarlyAccessPitch() {
  return <AgentPitchPage pitch={PITCH} />;
}
