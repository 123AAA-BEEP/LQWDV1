import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Consulting services" };
export const dynamic = "force-dynamic";

interface Service {
  name: string;
  tagline: string;
  description: string;
}

const FRACTIONAL_SERVICES: Service[] = [
  {
    name: "Fractional sales & marketing",
    tagline: "Hire a fractional CMO or sales lead",
    description:
      "On-demand senior sales and marketing leadership for developers who need strategy and execution without a full-time hire.",
  },
  {
    name: "Marketing & PR agencies",
    tagline: "Access vetted agency partners",
    description:
      "Connect developers with marketing, PR, and creative agencies — and flag accounts that may be ready to switch providers as a lead-gen signal.",
  },
  {
    name: "Event staff",
    tagline: "Staff your sales centre & launches",
    description:
      "Source hosts, sales centre staff, and event support for project launches and open houses on a flexible, project-by-project basis.",
  },
  {
    name: "Market research",
    tagline: "On-demand research & insights",
    description:
      "Commission pricing studies, competitor scans, and buyer-demand research to de-risk launches and positioning decisions.",
  },
  {
    name: "Advisory & consulting",
    tagline: "Access consulting services",
    description:
      "Bring in specialist consultants for go-to-market, brand, and growth advice tailored to new-home developments.",
  },
];

export default function AdminConsulting() {
  return (
    <div className="space-y-6">
      <Card className="border-brand-200 bg-brand-50">
        <CardBody className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">
              Hire a fractional &amp; access consulting services
            </h2>
            <Badge tone="brand">Coming soon</Badge>
          </div>
          <p className="text-sm text-slate-600">
            A future marketplace connecting developers with fractional talent,
            agencies, event staff, and research — and a lead-generation surface
            for LIQWD to flag developers who may need a new marketing or PR
            partner. This is a placeholder for the section we&apos;ll build out.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {FRACTIONAL_SERVICES.map((s) => (
          <Card key={s.name} className="h-full">
            <CardBody className="space-y-1.5">
              <p className="font-medium text-ink">{s.name}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                {s.tagline}
              </p>
              <p className="text-sm text-slate-600">{s.description}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
