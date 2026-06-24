"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { sourceHeroesNow } from "../projects/[id]/seo-actions";
import type { SourcingResult } from "@/lib/hero-sourcing";

/**
 * Runs the hero-sourcing pipeline on demand (3 projects), showing per-project
 * outcomes so an admin can watch quality. The weekly cron runs the same logic.
 */
export function SourceHeroesButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<SourcingResult[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    const res = await sourceHeroesNow();
    setBusy(false);
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    setResults(res.results);
    setSummary(
      `Checked ${res.processed} project${res.processed === 1 ? "" : "s"} · published ${res.published}.`,
    );
  }

  return (
    <div className="space-y-3">
      {err ? <Notice tone="error">{err}</Notice> : null}
      {summary ? <Notice tone="success">{summary}</Notice> : null}
      {results && results.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.id} className="flex items-start gap-2">
              <span aria-hidden>{r.published ? "✅" : "⏭️"}</span>
              <span>
                <span className="font-medium text-ink">{r.name}</span>{" "}
                <span className="text-slate-500">
                  — {r.published ? `published (${r.kind})` : r.reason}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="button" variant="secondary" onClick={run} disabled={busy}>
        {busy ? "Sourcing & verifying…" : "Source & publish next batch (3)"}
      </Button>
    </div>
  );
}
