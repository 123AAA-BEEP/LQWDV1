"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Read-only invite link with a copy-to-clipboard button. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — selection still works.
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
      />
      <Button type="button" variant="secondary" onClick={copy} className="shrink-0">
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}
