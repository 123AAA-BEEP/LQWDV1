"use client";

import { usePathname } from "next/navigation";
import { VerificationBanner } from "./verification-banner";
import type { VerificationStatus } from "@/lib/types";

/**
 * Hides the slim verification banner on the dashboard HOME only — there the
 * activation tracker carries the same job with richer context. Every other
 * dashboard page keeps the banner exactly as before.
 */
export function VerificationBannerGate({
  status,
}: {
  status: VerificationStatus;
}) {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;
  return <VerificationBanner status={status} />;
}
