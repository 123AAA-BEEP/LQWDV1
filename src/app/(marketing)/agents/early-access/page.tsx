import type { Metadata } from "next";
import { RealtorLanding } from "@/components/marketing/realtor-landing";

export const metadata: Metadata = {
  title: "Know What's Coming Before It Launches — For Agents",
  description:
    "LIQWD tracks planning applications, architect portfolios, and builder pipelines — so agents see new developments at the planning stage, before marketing exists.",
  alternates: { canonical: "/agents/early-access" },
};

/** Campaign variant: same designed LP, hero pitched on early access. */
export default function EarlyAccessLanding() {
  return (
    <RealtorLanding
      hero={{
        headline: "Know what's coming",
        subheadline: "before it launches.",
        body: "LIQWD watches planning applications, architect portfolios, and builder pipelines every day — so the projects in your farm area show up here at the planning stage, months before a sales centre opens. Walk into every conversation already knowing what's coming.",
      }}
    />
  );
}
