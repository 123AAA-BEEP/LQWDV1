import type { Metadata } from "next";
import Link from "next/link";
import { HstCalculator } from "@/components/tools/hst-calculator";
import { HubFaq } from "@/components/public/hub-sections";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "HST New Housing Rebate Calculator (Ontario)",
  description:
    "Estimate the federal and Ontario HST new-housing rebates on a new home: 36% of GST (max $6,300) plus 75% of the provincial portion (max $24,000).",
  alternates: { canonical: "/tools/hst-rebate-calculator" },
};

const FAQ = [
  {
    question: "How much is the HST rebate on a new home in Ontario?",
    answer:
      "Two pieces: a federal rebate of 36% of the 5% GST (up to $6,300, phasing out between $350,000 and $450,000) and an Ontario rebate of 75% of the 8% provincial portion (up to $24,000, with no upper price cutoff). Most new homes over $400,000 see the full $24,000 Ontario piece.",
  },
  {
    question: "Do builder prices already include the HST rebate?",
    answer:
      "Usually, yes — for buyers who will live in the home, advertised pre-construction prices are typically net of HST with the rebate assigned to the builder at closing. If you don't qualify (for example the home isn't your primary residence), the rebate amount gets added back at closing.",
  },
  {
    question: "Can investors get an HST rebate?",
    answer:
      "Not the new-housing rebate — but an investor who leases the unit with a one-year lease can usually claim the New Residential Rental Property (NRRP) rebate afterwards, which is calculated the same way. You pay the full HST at closing and file for the NRRP rebate yourself.",
  },
  {
    question: "When do I get the rebate?",
    answer:
      "Owner-occupiers usually never see it as cash — it's credited in the purchase price via assignment to the builder. Investors filing for the NRRP rebate typically receive it from the CRA within a few months of filing after closing with a lease in place.",
  },
];

export default function HstPage() {
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
    name: "HST New Housing Rebate Calculator",
    url: `${SITE_URL}/tools/hst-rebate-calculator`,
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
        <span aria-current="page" className="font-medium text-slate-700">HST rebate</span>
      </nav>

      <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink">
        HST new-housing rebate calculator
      </h1>
      <p className="mt-3 text-lg text-slate-600">
        New homes in Ontario carry 13% HST — but the new-housing rebates give
        most of the provincial portion back. Estimate both pieces for a
        primary residence.
      </p>

      <div className="mt-8">
        <HstCalculator />
      </div>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold text-ink">Common questions</h2>
        <HubFaq faq={FAQ} />
      </section>

      <p className="mt-10 text-sm text-slate-600">
        Also see the{" "}
        <Link href="/tools/land-transfer-tax-calculator" className="font-medium text-brand-700 hover:underline">
          land-transfer-tax calculator
        </Link>{" "}
        and{" "}
        <Link href="/tools/pre-construction-deposit-calculator" className="font-medium text-brand-700 hover:underline">
          deposit-schedule calculator
        </Link>
        , or browse new construction in{" "}
        <Link href="/new-homes/toronto" className="font-medium text-brand-700 hover:underline">Toronto</Link> and{" "}
        <Link href="/new-homes/mississauga" className="font-medium text-brand-700 hover:underline">Mississauga</Link>.
      </p>

      <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Estimates for general information only. Rebate eligibility depends on
        your circumstances — confirm with an accountant or your real-estate
        lawyer.
      </p>
    </div>
  );
}
