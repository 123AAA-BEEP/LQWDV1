"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Phone, X } from "lucide-react";

/**
 * "You're browsing with John Smith" — the visible half of "every link you
 * share is yours" (positioning blueprint, Part 1). When a buyer arrived
 * through an agent's link, the 30-day `liqwd_ref` cookie already routes
 * every inquiry to that agent; this strip makes that visible on every
 * consumer page: name, title, brokerage, call / text / email (the RECO
 * identification block), and a link to the agent's public page. LIQWD stays
 * the brand of the site; the agent is the agent of record on it.
 *
 * Client-side on purpose: it reads the cookie in the browser and fetches
 * the public card, so static public pages stay static. Dismiss hides it
 * for the session only — the attribution itself is untouched.
 */

interface FollowAgent {
  first_name: string | null;
  last_name: string | null;
  title_label: string | null;
  brokerage: string | null;
  phone: string | null;
  email: string | null;
  slug: string | null;
  avatar_url: string | null;
}

const COOKIE = "liqwd_ref";
const CODE_RE = /^[A-Z0-9]{4,16}$/;
const DISMISS_KEY = "liqwd_follow_dismissed";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function initials(first: string | null, last: string | null) {
  return [first, last]
    .filter(Boolean)
    .map((p) => (p as string)[0]?.toUpperCase())
    .join("") || "?";
}

export function AgentFollowStrip() {
  // The active code only feeds the dismiss handler, so it lives in a ref —
  // no render depends on it and no state is set synchronously in the effect.
  const codeRef = useRef<string | null>(null);
  const [agent, setAgent] = useState<FollowAgent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const c = (readCookie(COOKIE) ?? "").toUpperCase();
    if (!CODE_RE.test(c)) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === c) return;
    } catch {
      /* storage unavailable — show anyway */
    }
    codeRef.current = c;

    let cancelled = false;
    const cacheKey = `liqwd_follow_${c}`;
    (async () => {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          if (!cancelled) setAgent(JSON.parse(cached) as FollowAgent);
          return;
        }
      } catch {
        /* fall through to fetch */
      }
      try {
        const res = await fetch(`/api/agent-follow?code=${encodeURIComponent(c)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { agent: FollowAgent | null };
        if (!json.agent) return;
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(json.agent));
        } catch {
          /* ignore */
        }
        if (!cancelled) setAgent(json.agent);
      } catch {
        /* network hiccup — the strip is a courtesy, never an error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!agent || hidden) return null;

  const name = [agent.first_name, agent.last_name].filter(Boolean).join(" ");
  const sub = [agent.title_label, agent.brokerage].filter(Boolean).join(" · ");
  const nameEl = agent.slug ? (
    <Link href={`/realtors/${agent.slug}`} className="font-semibold text-ink hover:underline">
      {name}
    </Link>
  ) : (
    <span className="font-semibold text-ink">{name}</span>
  );
  const btn =
    "inline-flex items-center gap-1 rounded-md border border-brand-200 bg-white px-2.5 py-1 text-xs font-medium text-brand-800 hover:bg-brand-50";

  return (
    <div
      role="region"
      aria-label="Your agent"
      className="sticky top-[72px] z-30 border-b border-brand-100 bg-brand-50/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-2 text-sm">
        {agent.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.avatar_url}
            alt=""
            className="size-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
            {initials(agent.first_name, agent.last_name)}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate">
          <span className="text-slate-500">You&apos;re browsing with </span>
          {nameEl}
          {sub ? <span className="hidden text-slate-500 sm:inline"> · {sub}</span> : null}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {agent.phone ? (
            <a href={`tel:${agent.phone}`} className={btn}>
              <Phone className="size-3.5" aria-hidden /> Call
            </a>
          ) : null}
          {agent.phone ? (
            <a href={`sms:${agent.phone}`} className={`${btn} hidden sm:inline-flex`}>
              <MessageSquare className="size-3.5" aria-hidden /> Text
            </a>
          ) : null}
          {agent.email ? (
            <a href={`mailto:${agent.email}`} className={`${btn} hidden sm:inline-flex`}>
              <Mail className="size-3.5" aria-hidden /> Email
            </a>
          ) : null}
          <button
            type="button"
            aria-label="Hide for now"
            onClick={() => {
              setHidden(true);
              try {
                if (codeRef.current) sessionStorage.setItem(DISMISS_KEY, codeRef.current);
              } catch {
                /* ignore */
              }
            }}
            className="ml-1 flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
