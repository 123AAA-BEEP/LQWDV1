import type { Metadata } from "next";
import { requireUserProfile, isDeveloper } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/dashboard/onboarding/wizard";

export const metadata: Metadata = { title: "Get started" };
export const dynamic = "force-dynamic";

export default async function StartPage() {
  // Realtor-facing onboarding. Developers have their own role-specific home, so
  // send them there rather than show realtor earn paths.
  const { profile } = await requireUserProfile();
  if (isDeveloper(profile)) redirect("/dashboard");

  return <OnboardingWizard />;
}
