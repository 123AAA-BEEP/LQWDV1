"use client";

import { useEffect, useRef } from "react";

/**
 * Confetti for EARNED moments only — never on arrival, never on errors, never
 * repeatable by refresh. canvas-confetti is dynamically imported so it costs
 * nothing until a celebration actually renders, and prefers-reduced-motion
 * skips the animation entirely (any onFired side-effect still runs, so
 * once-only DB flags are stamped regardless of motion settings).
 *
 *  - guardKey: sessionStorage key for same-tab refresh protection (moment A).
 *  - onFired:  server action for cross-device once-only protection (moment B).
 */
export function ConfettiBurst({
  variant = "burst",
  guardKey,
  onFired,
}: {
  variant?: "burst" | "big";
  guardKey?: string;
  onFired?: () => Promise<void>;
}) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (guardKey) {
      try {
        if (sessionStorage.getItem(guardKey)) return;
        sessionStorage.setItem(guardKey, "1");
      } catch {
        // Storage unavailable (private mode) — still fire once per mount.
      }
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    void (async () => {
      if (!reduced) {
        try {
          const confetti = (await import("canvas-confetti")).default;
          if (variant === "big") {
            confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
            const end = Date.now() + 1200;
            const interval = window.setInterval(() => {
              if (Date.now() > end) {
                window.clearInterval(interval);
                return;
              }
              confetti({ particleCount: 40, angle: 60, spread: 65, origin: { x: 0, y: 0.7 } });
              confetti({ particleCount: 40, angle: 120, spread: 65, origin: { x: 1, y: 0.7 } });
            }, 250);
          } else {
            confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
          }
        } catch {
          // Confetti is decoration — never let it break the page.
        }
      }
      if (onFired) {
        await onFired().catch(() => {});
      }
    })();
  }, [variant, guardKey, onFired]);

  return null;
}
