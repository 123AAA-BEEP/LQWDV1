"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { backfillSections } from "../projects/[id]/seo-actions";

/**
 * Runs the section backfill 8 projects at a time, reporting how many were
 * generated and how many still need sections. Click until remaining hits 0.
 */
export function BackfillSectionsButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    const res = await backfillSections();
    setBusy(false);
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    setMsg(
      res.processed === 0 && res.remaining === 0
        ? "All published projects already have their sections."
        : `Generated ${res.processed} this run · ${res.remaining} still missing sections.`,
    );
  }

  return (
    <div className="space-y-3">
      {err ? <Notice tone="error">{err}</Notice> : null}
      {msg ? <Notice tone="success">{msg}</Notice> : null}
      <Button type="button" variant="secondary" onClick={run} disabled={busy}>
        {busy ? "Generating…" : "Backfill content sections (8 per run)"}
      </Button>
    </div>
  );
}
