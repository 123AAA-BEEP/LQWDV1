"use client";

/**
 * First-run nudge into the onboarding walkthrough. Dismissible, and the choice
 * sticks (localStorage) so we don't nag returning agents. Lightweight on
 * purpose — no profile column / migration needed for v1.
 *
 * Reads the dismissed flag via useSyncExternalStore so the server snapshot
 * (hidden) and client snapshot stay in sync without a hydration mismatch.
 */

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Sparkles, X, ArrowRight } from "lucide-react";

const KEY = "liqwd_onboarding_dismissed_v1";

let listeners: (() => void)[] = [];
function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
function getSnapshot() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
// On the server we can't know — render dismissed (hidden) to avoid a flash; the
// client snapshot reconciles immediately after hydration.
function getServerSnapshot() {
  return true;
}
function dismiss() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function GetStartedBanner() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-600"
      >
        <X className="size-4" aria-hidden />
      </button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:pr-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
            <Sparkles
              className="size-5 text-emerald-600"
              strokeWidth={1.75}
              aria-hidden
            />
          </span>
          <div>
            <h2 className="font-semibold text-ink">
              New here? See how you get paid on LIQWD
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              A 2-minute walkthrough of the simplest ways to earn — pick one and
              we&apos;ll show you how.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/start"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Show me how <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
