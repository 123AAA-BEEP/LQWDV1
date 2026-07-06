import type { Metadata } from "next";
import { RealtorLanding } from "@/components/marketing/realtor-landing";

export const metadata: Metadata = {
  title: "For Agents — Free New-Home Buyer Leads",
  description:
    "LIQWD builds the public page for every new development and routes its buyer inquiries to the verified agent who claims it. Free — no referral fees, no brokerage change.",
  alternates: { canonical: "/agents" },
};

export default function LandingPage() {
  return <RealtorLanding />;
}
