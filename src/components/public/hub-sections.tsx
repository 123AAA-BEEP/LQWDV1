import { ChevronDown } from "lucide-react";

/**
 * Shared building blocks for programmatic hub pages (city + builder).
 *
 * Accordions are native <details>/<summary>: server-rendered, no client JS,
 * and — critically for SEO — Google indexes content inside collapsed
 * <details> (it's in the DOM, not hidden via display tricks). So the page
 * carries the keyword weight of a long article while the reader sees a clean,
 * scannable page. This is the legitimate density play, not cloaking.
 */

/** A prose paragraph block: splits on blank lines into <p>s. */
export function Prose({ text }: { text: string | null | undefined }) {
  if (!text?.trim()) return null;
  const paras = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-slate-600">
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** A collapsible section. defaultOpen renders it expanded for the reader. */
export function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-slate-200 py-4 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-ink">
        <span>{title}</span>
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

/** FAQ rendered as accordions (pairs with FAQPage JSON-LD on the page). */
export function HubFaq({
  faq,
}: {
  faq: { question: string; answer: string }[];
}) {
  if (!faq?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5">
      {faq.map((f, i) => (
        <Accordion key={i} title={f.question}>
          <p className="text-[15px] leading-relaxed text-slate-600">{f.answer}</p>
        </Accordion>
      ))}
    </div>
  );
}

/** A stat pill for the market-snapshot bar. */
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-lg font-semibold text-ink">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
