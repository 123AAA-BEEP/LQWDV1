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
      "On-demand senior sales and marketing leadership without a full-time hire — strategy and execution for your launches.",
  },
  {
    name: "Marketing & PR agencies",
    tagline: "Access vetted agency partners",
    description:
      "Get matched with marketing, PR, and creative agencies that specialize in new-home developments.",
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

export default function DeveloperConsulting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Hire a fractional &amp; access consulting services
        </h1>
        <p className="mt-1 text-slate-500">
          On-demand fractional talent, agencies, event staff, and research to
          help you launch and sell your developments.
        </p>
      </div>

      <Card className="border-brand-200 bg-brand-50">
        <CardBody className="flex flex-wrap items-center gap-3">
          <Badge tone="brand">Coming soon</Badge>
          <p className="text-sm text-slate-600">
            This marketplace is on the way. Browse the services we&apos;re
            building out below.
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
