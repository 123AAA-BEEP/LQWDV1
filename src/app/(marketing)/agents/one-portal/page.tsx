import type { Metadata } from "next";
import { AgentPitchPage, type PitchConfig } from "@/components/marketing/agent-pitch-page";

export const metadata: Metadata = {
  title: "Every New-Construction Project, One Portal — For Agents",
  description:
    "Stop chasing PDFs, portals, and scattered emails. LIQWD brings new-construction inventory — pricing, status, incentives — into one clean workflow for agents.",
  alternates: { canonical: "/agents/one-portal" },
};

const PITCH: PitchConfig = {
  eyebrow: "For real estate agents",
  headline: "Every project.",
  accent: "One portal.",
  sub: "New-construction knowledge lives in a hundred places — builder PDFs, VIP portals, launch emails, aggregator sites. LIQWD pulls the market into one place, kept current by machine and by the agents working it.",
  proof: [
    "Hundreds of active projects",
    "Seven markets and growing",
    "Free for verified agents",
  ],
  sections: [
    {
      title: "Stop chasing scattered information",
      body: "Price lists in your inbox, floor plans in a portal, status changes announced nowhere. LIQWD consolidates the essentials on one page per project: builder, address, home types, price band, sales status, and stage.",
      bullets: [
        "Search and filter by city, home type, and status",
        "Browse by market — Ontario-first, plus BC, Alberta, and the US Sun Belt",
        "City hub pages for the areas you farm",
      ],
    },
    {
      title: "Fresh by design",
      body: "An automated pipeline verifies new projects against the open web before they publish, and flags stale details for review. When something's wrong, it gets caught — that's the standard a professional tool should hold.",
      bullets: [
        "New projects verified before they go live",
        "Machine-sourced renderings, vetted for accuracy",
        "Agent updates welcomed — suggest corrections from any project page",
      ],
    },
    {
      title: "Built for your workflow, not the public's",
      body: "Verified agents get the professional layer: broker portals and worksheets links, commission context where builders share it, and the ability to be matched to public project pages and their buyer inquiries.",
      bullets: [
        "No referral fees, no brokerage change",
        "Licence verification keeps it professionals-only",
        "Free — the portal is not a subscription product",
      ],
    },
  ],
  cta: {
    heading: "One tab instead of twenty.",
    body: "Sign up free, verify your licence, and work new construction from a single clean portal.",
  },
};

export default function OnePortalPitch() {
  return <AgentPitchPage pitch={PITCH} />;
}
