import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { requireUserProfile, isDeveloper } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { cn } from "@/lib/cn";
import { SECTION_ACCENT } from "@/lib/section-accents";
import { registerRentalPartnerInterest } from "../launch-services/actions";

export const metadata: Metadata = { title: "Rental lead partnerships" };
export const dynamic = "force-dynamic";

/**
 * PBR lead partnerships — the developer-facing pitch for the rentals lane.
 * The consumer rails already exist (/rentals browse + renter lead capture +
 * the rental-referrals loop); this surface recruits the SUPPLY side:
 * purpose-built-rental owners who pay per qualified renter lead / signed
 * lease. Interest capture only — pilot terms are a conversation, not a
 * checkout, while we validate pricing.
 */
export default async function RentalPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string; flash_tone?: string }>;
}) {
  const sp = await searchParams;
  const { profile } = await requireUserProfile();
  if (!isDeveloper(profile)) redirect("/dashboard");
  const a = SECTION_ACCENT.emerald;

  return (
    <div className="space-y-6">
      <FlashNotice searchParams={sp} />
      <div className={cn("rounded-2xl p-6 ring-1 ring-inset sm:p-8", a.zone)}>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
            a.chip,
          )}
        >
          <KeyRound className="size-3" strokeWidth={2} aria-hidden /> Rental
          lead partnerships
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Leasing a purpose-built rental? We&apos;ll send you qualified renters.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          LIQWD captures renter demand across our marketplace and agent
          network — move-in window, bedroom needs, and budget qualified before
          it reaches you. Partners pay per qualified lead or per signed lease;
          vacancy costs more than either. Pilot pricing is scoped per
          building.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-ink">Qualified, not raw</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Renter leads arrive with move-in timing, bedrooms, and budget —
              your leasing team calls people ready to book a tour.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-ink">Agent network on top</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Verified agents refer renter clients into partner buildings —
              a second demand channel most lease-ups never tap.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-ink">Pay for outcomes</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Per qualified lead or per signed lease — marketing spend tied to
              actual lease-up, not impressions.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink">Talk pilot terms</h2>
          <form action={registerRentalPartnerInterest} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Building / project" htmlFor="rp_building">
                <Input id="rp_building" name="building" required maxLength={200} />
              </Field>
              <Field label="City" htmlFor="rp_city">
                <Input id="rp_city" name="city" maxLength={120} />
              </Field>
              <Field label="Units" htmlFor="rp_units">
                <Input id="rp_units" name="units" maxLength={20} placeholder="e.g. 180" />
              </Field>
            </div>
            <Field
              label="Lease-up window"
              htmlFor="rp_leaseup"
              hint="e.g. 'Leasing now', 'First occupancy March 2027'"
            >
              <Input id="rp_leaseup" name="leaseup" maxLength={120} />
            </Field>
            <Field label="Anything else? (optional)" htmlFor="rp_notes">
              <Textarea id="rp_notes" name="notes" className="min-h-16" maxLength={2000} />
            </Field>
            <Button type="submit">Register interest</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
