import type { Metadata } from "next";
import { RealtorLanding } from "@/components/marketing/realtor-landing";

export const metadata: Metadata = {
  title: "Every New-Construction Project, One Portal — For Agents",
  description:
    "Stop chasing PDFs, portals, and scattered emails. LIQWD brings new-construction inventory — pricing, status, incentives — into one clean workflow for agents.",
  alternates: { canonical: "/agents/one-portal" },
};

/** Campaign variant: same designed LP, hero pitched on consolidation. */
export default function OnePortalLanding() {
  return (
    <RealtorLanding
      hero={{
        headline: "Every project.",
        subheadline: "One portal.",
        body: "Price lists in your inbox, floor plans in a VIP portal, status changes announced nowhere. LIQWD pulls the new-construction market into one clean workflow — builder, pricing, status, and incentives on one page per project, kept current.",
      }}
    />
  );
}
