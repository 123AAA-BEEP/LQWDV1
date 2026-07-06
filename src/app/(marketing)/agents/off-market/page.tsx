import type { Metadata } from "next";
import { AgentPitchPage, type PitchConfig } from "@/components/marketing/agent-pitch-page";

export const metadata: Metadata = {
  title: "The Verified Broker-to-Broker Layer — For Agents",
  description:
    "Off-market haves and wants, builder incentives, and commission context — inside a licence-verified network of agents, not the open web.",
  alternates: { canonical: "/agents/off-market" },
};

const PITCH: PitchConfig = {
  eyebrow: "For real estate agents",
  headline: "The layer the public",
  accent: "never sees.",
  sub: "Some deals shouldn't live on the open web. LIQWD's verified network gives agents an off-market board, builder incentives, and commission context — gated to licensed professionals.",
  proof: [
    "Licence-verified members only",
    "Off-market board",
    "Free for verified agents",
  ],
  sections: [
    {
      title: "An off-market board that works like the old boards did",
      body: "Post your haves and wants — assignments, quiet listings, buyer needs, services — to a network of verified agents instead of a public feed. Attach photos, set your contact terms, keep control.",
      bullets: [
        "Haves, wants, and services in one board",
        "Visible to verified agents only",
        "Your listing, your contact details, your terms",
      ],
    },
    {
      title: "Commission context, where builders share it",
      body: "On participating projects, verified agents see the commercial layer the public page never shows — commission structure, negotiability, and broker portal links — so you can qualify an opportunity before you pitch it.",
      bullets: [
        "Broker-only fields, separated from public content by design",
        "Direct links to builder portals and worksheets",
        "Suggest updates when you know terms have moved",
      ],
    },
    {
      title: "Trust is the product",
      body: "Everything gated behind licence verification: real agents, real brokerages, accountable behaviour. That's why builders share more here than they will on the open web — and why the network gets more valuable as it grows.",
      bullets: [
        "Licence verification required for access",
        "No referral fees, no brokerage change",
        "Free for verified agents",
      ],
    },
  ],
  cta: {
    heading: "Join the verified layer.",
    body: "Sign up free, verify your licence, and get access to the board and the broker-only project details.",
  },
};

export default function OffMarketPitch() {
  return <AgentPitchPage pitch={PITCH} />;
}
