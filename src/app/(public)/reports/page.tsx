import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Market Reports & Data",
  description:
    "Live new-construction market data from LIQWD — inventory, pricing, and completion timelines across the markets we track.",
  alternates: { canonical: "/reports" },
};

const REPORTS = [
  {
    href: "/reports/gta-pre-construction",
    title: "GTA Pre-Construction Report",
    blurb:
      "Live Greater Toronto Area new-construction inventory by city, home type, price band, and completion year.",
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink">
        Market reports
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        Live data on new-construction inventory, drawn from the developments we
        track across builder portals, municipal activity, and public launches.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="group block h-full">
            <Card className="h-full transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
              <CardBody>
                <BarChart3 aria-hidden className="size-6 text-brand-600" />
                <h2 className="mt-3 font-semibold text-ink">{r.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.blurb}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
