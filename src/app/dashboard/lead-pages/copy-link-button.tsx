"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Compact "copy this referral link" button for list rows. Copies the full URL
 * to the clipboard and flips to a confirmation for ~2s. The URL is exposed via
 * the native title tooltip so the realtor can eyeball where it points.
 */
export function CopyLinkButton({
  url,
  label = "Copy referral link",
}: {
  url: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — no-op.
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={copy}
      title={url}
      className="shrink-0"
    >
      {copied ? (
        <>
          <Check className="size-4" aria-hidden /> Copied!
        </>
      ) : (
        <>
          <Link2 className="size-4" aria-hidden /> {label}
        </>
      )}
    </Button>
  );
}
