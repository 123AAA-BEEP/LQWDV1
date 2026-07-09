import type { Metadata } from "next";
import Link from "next/link";
import { LttCalculator } from "@/components/tools/ltt-calculator";
import { HubFaq } from "@/components/public/hub-sections";
import {
  ONTARIO_LTT,
  TORONTO_MLTT,
  ONTARIO_FTB_REBATE_MAX,
  TORONTO_FTB_REBATE_MAX,
} from "@/lib/calculators";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Ontario Land Transfer Tax Calculator (2025) — with Toronto MLTT",
  description:
    "Calculate Ontario land transfer tax instantly, including Toronto's municipal tax and first-time-buyer rebates. Full rate tables and examples.",
  alternates: { canonical: "/tools/land-transfer-tax-calculator" },
};

const FAQ = [
  {
    question: "How much is land transfer tax in Ontario?",
    answer:
      "Ontario charges a marginal tax on the purchase price: 0.5% on the first $55,000, 1% up to $250,000, 1.5% up to $400,000, 2% up to $2,000,000, and 2.5% above that for single-family residences. On an $800,000 home the provincial tax is $12,475.",
  },
  {
    question: "Do I pay double land transfer tax in Toronto?",
    answer:
      "Effectively yes. Homes inside the City of Toronto pay a municipal land transfer tax on top of the provincial one, with matching brackets up to $2M and graduated luxury tiers above $3M. An $800,000 Toronto purchase pays roughly $24,950 combined.",
  },
  {
    question: "What is the first-time home buyer rebate?",
    answer:
      "Eligible first-time buyers get a rebate of up to $4,000 on the Ontario tax and up to $4,475 on the Toronto municipal tax. Together they eliminate land transfer tax entirely on homes up to roughly $368,000 (Ontario) and $400,000 (Toronto).",
  },
  {
    question: "Is land transfer tax different on pre-construction homes?",
    answer:
      "The tax works the same, but it isn't due when you sign or pay deposits — it's payable at final closing, when title transfers. On a pre-construction condo that can be years after purchase, so budget for it alongside your closing costs.",
  },
  {
    question: "Can land transfer tax be added to my mortgage?",
    answer:
      "No — it's a closing cost paid in cash on the day title transfers, on top of your down payment. Your lawyer collects and remits it as part of closing.",
  },
];

function RateTable({ title, brackets }: { title: string; brackets: typeof ONTARIO_LTT }) {
  return (
    <div>
      <h3 className="font-semibold text-ink">{title}</h3>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-1.5 font-medium">Price portion</th>
            <th className="py-1.5 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {brackets.map((b, i) => {
            const prev = i === 0 ? 0 : brackets[i - 1].upTo!;
            const label = b.upTo
              ? `$${prev.toLocaleString()} – $${b.upTo.toLocaleString()}`
              : `Above $${prev.toLocaleString()}`;
            return (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-700">{label}</td>
                <td className="py-1.5 text-right font-medium text-ink">
                  {(b.rate * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function LttPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Ontario Land Transfer Tax Calculator",
    url: `${SITE_URL}/tools/land-transfer-tax-calculator`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      {[faqSchema, appSchema].map((b, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }} />
      ))}

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/tools" className="hover:text-ink hover:underline">Buyer tools</Link>
        <span aria-hidden className="mx-1.5 text-slate-300">/</span>
        <span aria-current="page" className="font-medium text-slate-700">Land transfer tax</span>
      </nav>

      <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink">
        Ontario land transfer tax calculator
      </h1>
      <p className="mt-3 text-lg text-slate-600">
        Instant provincial and Toronto municipal land transfer tax, with
        first-time-buyer rebates applied. Payable at final closing — on
        pre-construction, that&apos;s when title transfers, not when you sign.
      </p>

      <div className="mt-8">
        <LttCalculator />
      </div>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <RateTable title="Ontario rates" brackets={ONTARIO_LTT} />
        <RateTable title="Toronto municipal rates" brackets={TORONTO_MLTT} />
      </section>
      <p className="mt-4 text-sm text-slate-600">
        First-time-buyer rebates: up to ${ONTARIO_FTB_REBATE_MAX.toLocaleString()} provincial
        and ${TORONTO_FTB_REBATE_MAX.toLocaleString()} municipal. Non-resident buyers may
        also owe Ontario&apos;s 25% Non-Resident Speculation Tax — not included here.
      </p>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold text-ink">Common questions</h2>
        <HubFaq faq={FAQ} />
      </section>

      <p className="mt-10 text-sm text-slate-600">
        Shopping new construction?{" "}
        <Link href="/new-homes/toronto" className="font-medium text-brand-700 hover:underline">Toronto</Link>,{" "}
        <Link href="/new-homes/mississauga" className="font-medium text-brand-700 hover:underline">Mississauga</Link>, and{" "}
        <Link href="/new-homes/brampton" className="font-medium text-brand-700 hover:underline">Brampton</Link>{" "}
        have the deepest inventories. Also see the{" "}
        <Link href="/tools/pre-construction-deposit-calculator" className="font-medium text-brand-700 hover:underline">
          deposit-schedule calculator
        </Link>{" "}
        and{" "}
        <Link href="/tools/hst-rebate-calculator" className="font-medium text-brand-700 hover:underline">
          HST rebate estimator
        </Link>.
      </p>

      <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Estimates for general information only, based on published rates as of 2025.
        Confirm exact amounts with your real-estate lawyer before closing.
      </p>
    </div>
  );
}
