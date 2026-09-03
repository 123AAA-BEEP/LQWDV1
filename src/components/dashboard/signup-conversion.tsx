"use client";

import { useEffect } from "react";
import { markSignupConversionFired } from "@/app/dashboard/conversion-actions";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fires the Google Ads "signup_completed" conversion exactly once per
 * account, on the first authenticated render after signup (email
 * confirmation lands on /dashboard, so there is no thank-you page to hang
 * this on). Only the user id travels to Google as transaction_id — never
 * the click id or anything personal. Rendered by the dashboard layout only
 * while profiles.signup_conversion_fired_at is null and the account is new.
 */
export function SignupConversion({
  sendTo,
  transactionId,
}: {
  sendTo: string;
  transactionId: string;
}) {
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      if (typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: sendTo,
          transaction_id: transactionId,
          value: 0,
          currency: "CAD",
        });
        void markSignupConversionFired();
        return;
      }
      // The tag loads afterInteractive; give it a few seconds, then give up
      // quietly (it will retry on the next dashboard load).
      if (tries++ < 20) timer = setTimeout(attempt, 250);
    };
    attempt();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [sendTo, transactionId]);
  return null;
}
