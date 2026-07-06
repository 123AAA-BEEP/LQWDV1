import type { Metadata } from "next";
import { RealtorLanding } from "@/components/marketing/realtor-landing";

export const metadata: Metadata = {
  title: "The Verified Broker-to-Broker Layer — For Agents",
  description:
    "Off-market haves and wants, builder incentives, and commission context — inside a licence-verified network of agents, not the open web.",
  alternates: { canonical: "/agents/off-market" },
};

/** Campaign variant: same designed LP, hero pitched on the verified layer. */
export default function OffMarketLanding() {
  return (
    <RealtorLanding
      hero={{
        headline: "The deals the public",
        subheadline: "never sees.",
        body: "Some opportunities shouldn't live on the open web. LIQWD's licence-verified network gives you an off-market board, builder incentives, and commission context — broker-to-broker, gated to professionals like the old boards used to be.",
      }}
    />
  );
}
