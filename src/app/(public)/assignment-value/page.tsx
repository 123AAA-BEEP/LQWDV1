import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { AssignmentValueWizard } from "./wizard";

export const metadata: Metadata = {
  title: "What's My Pre-Construction Assignment Worth? Free Assessment",
  description:
    "Bought pre-construction and thinking about selling before closing? Get a free assignment assessment from an Ontario agent who works assignment sales — no obligation.",
  alternates: { canonical: "/assignment-value" },
};
export const dynamic = "force-dynamic";

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

/**
 * Assignment-seller lead capture. Targets the "sell my assignment" /
 * "what is my assignment worth" search intent — high-desperation queries
 * squarely in our niche, and we're one of the few sites with live
 * pre-construction project data to assess against. Honest model: no fake
 * instant number; assignment value hinges on the APS, builder consent, and
 * closing timing, so the offer is a human assessment. The gated-never-public
 * rule applies to Assignment Desk LISTINGS — this lead form is public by
 * design; nothing gets listed without the owner's consent.
 */
export default async function AssignmentValuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const source = first(sp.src).trim() || first(sp.utm_source).trim();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-balance text-center text-4xl font-semibold tracking-tight text-ink">
        What&apos;s your pre-construction assignment worth?
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-lg text-slate-600">
        Bought a pre-construction condo or town and thinking about selling
        before closing? Get a free assessment from an agent who works
        assignment sales — grounded in live project data, not a guess.
      </p>

      <Card className="mt-8">
        <CardBody className="p-6 sm:p-8">
          <AssignmentValueWizard source={source || undefined} />
        </CardBody>
      </Card>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-ink">
          What actually decides an assignment&apos;s value
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-ink">
                Today&apos;s market vs. your price
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                The spread between what you paid then and what comparable
                units — resale and new — sell for now.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-ink">
                Your agreement&apos;s terms
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Whether your APS permits assignment, the builder&apos;s
                consent process, and any fees it sets.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-ink">Timing</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                How close occupancy or final closing is changes both the
                buyer pool and the price.
              </p>
            </CardBody>
          </Card>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          General information, not legal, tax, or financial advice —
          assignment sales can have HST and tax consequences; confirm your
          situation with your lawyer and accountant. Are you an agent with an
          assignment to list?{" "}
          <Link
            href="/agents/assignment-desk"
            className="text-brand-700 hover:underline"
          >
            The Assignment Desk is for you →
          </Link>
        </p>
      </section>
    </div>
  );
}
