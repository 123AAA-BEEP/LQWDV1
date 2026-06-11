import { ButtonLink } from "@/components/ui/button";
import {
  HERO,
  PROOF_POINTS,
  BENEFITS,
  VERIFICATION,
  WHY,
  SIGNUP_SECTION,
} from "@/lib/brand";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="mt-0.5 size-5 shrink-0 text-brand-600"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
              {HERO.supporting}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
              {HERO.headline}
            </h1>
            <p className="mt-2 text-2xl font-medium text-slate-500 sm:text-3xl">
              {HERO.subheadline}
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              {HERO.body}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg">
                {HERO.primaryCta}
              </ButtonLink>
              <ButtonLink href="/signup" variant="secondary" size="lg">
                {HERO.secondaryCta}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Proof bar */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 py-8 sm:grid-cols-4">
          {PROOF_POINTS.map((point) => (
            <div key={point} className="px-2 text-center">
              <span className="text-sm font-medium text-slate-700">
                {point}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">
          One portal for new-home inventory
        </h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-5"
            >
              <CheckIcon />
              <span className="text-slate-700">{benefit}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Verification */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink">
              {VERIFICATION.heading}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              {VERIFICATION.body}
            </p>
          </div>
          <ul className="space-y-4">
            {VERIFICATION.bullets.map((b) => (
              <li key={b} className="flex gap-3">
                <CheckIcon />
                <span className="text-slate-700">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink">
              {WHY.heading}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              {WHY.body}
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {WHY.bullets.map((b) => (
              <li key={b} className="flex gap-3">
                <CheckIcon />
                <span className="text-slate-700">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Signup CTA */}
      <section className="border-t border-slate-200 bg-ink">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            {SIGNUP_SECTION.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            {SIGNUP_SECTION.body}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <ButtonLink href="/signup" size="lg">
              Sign up free
            </ButtonLink>
            <ButtonLink
              href="/signup"
              size="lg"
              variant="secondary"
              className="border-slate-600 bg-transparent text-white hover:bg-slate-800"
            >
              Start verification
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
