/**
 * Shared layout + section primitives for legal/policy pages (Privacy, Terms).
 * Keeps the policy pages consistent with the marketing design system
 * (max-width prose column, ink headings, slate body, brand accents).
 */
import type { ReactNode } from "react";

export function LegalLayout({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
      <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        <span aria-hidden className="h-px w-8 bg-brand-500" />
        Legal
      </p>
      <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-sm text-slate-500">Last updated: {updated}</p>
      {intro ? (
        <div className="mt-8 space-y-4 text-pretty text-lg leading-relaxed text-slate-600">
          {intro}
        </div>
      ) : null}
      <div className="mt-12 space-y-10 text-base">{children}</div>
    </section>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 leading-relaxed text-slate-600 [&_a]:text-brand-600 [&_a:hover]:underline [&_strong]:font-medium [&_strong]:text-ink">
      <h2 className="text-xl font-semibold tracking-tight text-ink">
        {heading}
      </h2>
      {children}
    </section>
  );
}
