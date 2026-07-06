import Link from "next/link";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/**
 * Campaign landing page for realtors — one focused pitch per page, so
 * outreach doesn't always lead with "free leads" (which can read as
 * too-good-to-be-true). Each variant highlights a different concrete value:
 * early access, consolidation, or the verified broker-to-broker layer.
 * Honest-expectations guardrails: no income promises, no lead guarantees.
 */

export interface PitchSection {
  title: string;
  body: string;
  bullets?: readonly string[];
}

export interface PitchConfig {
  eyebrow: string;
  headline: string;
  accent: string;
  sub: string;
  proof: readonly string[];
  sections: readonly PitchSection[];
  cta: { heading: string; body: string };
}

export function AgentPitchPage({ pitch }: { pitch: PitchConfig }) {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 pb-14 pt-16 sm:pt-24 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
            {pitch.eyebrow}
          </p>
          <h1 className="display-type mx-auto mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {pitch.headline}{" "}
            <span className="text-brand-600">{pitch.accent}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            {pitch.sub}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/signup" variant="primary" size="lg">
              Sign up free
            </ButtonLink>
            <ButtonLink href="/" variant="secondary" size="lg">
              Browse the inventory
            </ButtonLink>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No referral fees. No brokerage change. Licence verification
            required.
          </p>
        </div>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 pb-8 text-sm text-slate-500">
          {pitch.proof.map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5">
              <Check aria-hidden className="size-4 text-brand-600" /> {p}
            </span>
          ))}
        </div>
      </section>

      {/* Value sections */}
      <section className="bg-slate-50/70">
        <div className="mx-auto max-w-4xl space-y-10 px-6 py-14">
          {pitch.sections.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-9"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                {s.title}
              </h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
                {s.body}
              </p>
              {s.bullets?.length ? (
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-brand-600"
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-ink text-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="display-type text-3xl font-semibold tracking-tight sm:text-4xl">
            {pitch.cta.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            {pitch.cta.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/signup" variant="primary" size="lg">
              Sign up free
            </ButtonLink>
            <Link
              href="/agents"
              className="text-sm font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
            >
              See everything LIQWD does for agents →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
