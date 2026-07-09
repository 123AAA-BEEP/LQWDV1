import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, PiggyBank, ReceiptText } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Home Buyer Tools & Calculators",
  description:
    "Free calculators for new-construction buyers: Ontario land transfer tax (with Toronto MLTT), pre-construction deposit schedules, and the HST new-housing rebate.",
  alternates: { canonical: "/tools" },
};

const TOOLS = [
  {
    href: "/tools/land-transfer-tax-calculator",
    icon: Calculator,
    title: "Land transfer tax calculator",
    blurb:
      "Ontario + Toronto municipal tax with first-time-buyer rebates — the closing cost everyone forgets to budget.",
  },
  {
    href: "/tools/pre-construction-deposit-calculator",
    icon: PiggyBank,
    title: "Pre-construction deposit calculator",
    blurb:
      "See a staged deposit schedule in real dollars — 20% extended, 15%, 10%, and occupancy structures.",
  },
  {
    href: "/tools/hst-rebate-calculator",
    icon: ReceiptText,
    title: "HST new-housing rebate calculator",
    blurb:
      "Estimate the federal and Ontario rebates on a new home — up to $30,300 combined.",
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink">
        Buyer tools
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        Free calculators for the numbers that actually decide a new-construction
        purchase — taxes, deposits, and rebates.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="group block h-full">
            <Card className="h-full transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
              <CardBody>
                <t.icon aria-hidden className="size-6 text-brand-600" />
                <h2 className="mt-3 font-semibold text-ink">{t.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.blurb}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-12 text-sm text-slate-600">
        Ready to shop?{" "}
        <Link href="/" className="font-medium text-brand-700 hover:underline">
          Browse new &amp; pre-construction homes →
        </Link>
      </p>
    </div>
  );
}
