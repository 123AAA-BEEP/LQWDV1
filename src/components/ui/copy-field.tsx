"use client";

import { useState } from "react";
import { Button } from "./button";

/**
 * Read-only URL/text field with a copy-to-clipboard button — the one shared
 * implementation for referral links, claim links, and lead-page links.
 */
export function CopyField({
  value,
  copyLabel = "Copy link",
  size = "md",
  className,
}: {
  value: string;
  copyLabel?: string;
  /** `sm` is the compact in-card variant (smaller field text + button). */
  size?: "sm" | "md";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the field still
      // selects on focus as a manual fallback.
    }
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className ?? ""}`}>
      <input
        readOnly
        value={value}
        aria-label="Link to copy"
        onFocus={(e) => e.currentTarget.select()}
        className={
          size === "sm"
            ? "min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
            : "min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        }
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={copy}
        className="shrink-0"
      >
        {copied ? "Copied!" : copyLabel}
      </Button>
    </div>
  );
}
