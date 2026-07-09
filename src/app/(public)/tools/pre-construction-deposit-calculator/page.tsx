import type { Metadata } from "next";
import Link from "next/link";
import { DepositCalculator } from "@/components/tools/deposit-calculator";
import { HubFaq } from "@/components/public/hub-sections";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Pre-Construction Deposit Calculator — GTA Deposit Structures",
  description:
    "See what a pre-construction deposit schedule actually looks like in dollars: common GTA structures (20% extended, 15%, 10%), staged over time.",
  alternates: { canonical: "/tools/pre-construction-deposit-calculator" },
};

const FAQ = [
  {
    question: "How much deposit do I need for a pre-construction condo?",
    answer:
      "Most GTA builders ask for 15–20% of the purchase price, staged over one to two years — typically 5% with the offer (often a fixed amount like $10,000 first, with the balance in 30 days), then further 5% installments at set dates. Some projects run 10% or 5%-plus-occupancy incentive structures.",
  },
  {
    question: "Is the deposit paid all at once?",
    answer:
      "No — that's the defining feature of pre-construction. Deposits are staged: a typical 20% structure spreads four 5% payments across roughly a year, and the balance of the price isn't due until final closing, years later.",
  },
  {
    question: "Are pre-construction deposits protected in Ontario?",
    answer:
      "For new condos, deposits are held in trust and covered by Tarion's deposit protection ($20,000 plus excess coverage through the trust rules). Freehold homes have different, lower coverage. Ask where your deposit is held and confirm coverage before signing.",
  },
  {
    question: "Can I lose my deposit?",
    answer:
      "If you fail to close without a legal way out, the deposit is at risk — that's true of any agreement of purchase and sale. Ontario's 10-day cooling-off period for new condos lets you cancel within 10 days of signing for any reason with a full deposit refund.",
  },
  {
    question: "Do deposits earn interest?",
    answer:
      "For Ontario new condos, builders must pay prescribed interest on deposits, credited at closing. The rate is tied to the Bank of Canada rate and changes over time.",
  },
];

export default function DepositPage() {
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
    name: "Pre-Construction Deposit Calculator",
    url: `${SITE_URL}/tools/pre-construction-deposit-calculator`,
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
        <span aria-current="page" className="font-medium text-slate-700">Deposit calculator</span>
      </nav>

      <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink">
        Pre-construction deposit calculator
      </h1>
      <p className="mt-3 text-lg text-slate-600">
        Deposits on new construction are staged, not lump-sum — that&apos;s what
        makes pre-con accessible with less cash up front. Pick a price and a
        common structure to see the real dollar schedule.
      </p>

      <div className="mt-8">
        <DepositCalculator />
      </div>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold text-ink">Common questions</h2>
        <HubFaq faq={FAQ} />
      </section>

      <p className="mt-10 text-sm text-slate-600">
        Browse projects with staged deposits in{" "}
        <Link href="/new-homes/toronto" className="font-medium text-brand-700 hover:underline">Toronto</Link>,{" "}
        <Link href="/new-homes/mississauga" className="font-medium text-brand-700 hover:underline">Mississauga</Link>, and{" "}
        <Link href="/new-homes/brampton" className="font-medium text-brand-700 hover:underline">Brampton</Link>.
        Also see the{" "}
        <Link href="/tools/land-transfer-tax-calculator" className="font-medium text-brand-700 hover:underline">
          land-transfer-tax calculator
        </Link>{" "}
        and{" "}
        <Link href="/tools/hst-rebate-calculator" className="font-medium text-brand-700 hover:underline">
          HST rebate estimator
        </Link>.
      </p>

      <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Structures shown are common patterns, not any specific project&apos;s terms —
        every builder sets its own schedule. Review yours with a lawyer during
        the cooling-off period.
      </p>
    </div>
  );
}
