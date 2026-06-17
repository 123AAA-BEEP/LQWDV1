import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isApproved, isPro } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { createMandate } from "./actions";

export const metadata: Metadata = { title: "New buyer mandate" };
export const dynamic = "force-dynamic";

export default async function NewMandatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireUserProfile();
  const { error } = await searchParams;

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <Header />
        <VerificationRequired />
      </div>
    );
  }
  if (!isPro(profile)) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardBody className="text-center">
            <h2 className="text-lg font-semibold text-ink">A Pro feature</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Buyer Mandates are part of LIQWD Pro. Upgrade to submit mandates
              and let matching inventory find your buyer.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/upgrade"
                className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Upgrade to Pro
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />
      {error ? (
        <Notice tone="error">Couldn&apos;t save the mandate. Please try again.</Notice>
      ) : null}

      <form action={createMandate} className="space-y-6">
        <Section title="Buyer reference">
          <Field label="Your label for this buyer" htmlFor="buyer_label" hint="Private to you and admins — e.g. “Patel family” or “Buyer A”.">
            <Input id="buyer_label" name="buyer_label" placeholder="Buyer A" />
          </Field>
        </Section>

        <Section title="What they're looking for">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Areas / neighbourhoods" htmlFor="location_areas">
              <Input id="location_areas" name="location_areas" placeholder="Liberty Village, King West…" />
            </Field>
            <Field label="Search radius (km)" htmlFor="location_radius_km">
              <Input id="location_radius_km" name="location_radius_km" inputMode="decimal" placeholder="10" />
            </Field>
            <Field label="Price min (CAD)" htmlFor="price_min">
              <Input id="price_min" name="price_min" inputMode="numeric" placeholder="600000" />
            </Field>
            <Field label="Price max (CAD)" htmlFor="price_max">
              <Input id="price_max" name="price_max" inputMode="numeric" placeholder="900000" />
            </Field>
            <Field label="Financing" htmlFor="financing_type">
              <Select id="financing_type" name="financing_type" defaultValue="">
                <option value="">—</option>
                <option value="cash">Cash</option>
                <option value="mortgage">Mortgage</option>
                <option value="mixed">Mixed</option>
              </Select>
            </Field>
            <Field label="Property type" htmlFor="property_type">
              <Select id="property_type" name="property_type" defaultValue="">
                <option value="">Any</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="semi">Semi-detached</option>
                <option value="detached">Detached</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Size min (sq ft)" htmlFor="size_sqft_min">
              <Input id="size_sqft_min" name="size_sqft_min" inputMode="numeric" placeholder="700" />
            </Field>
            <Field label="Size max (sq ft)" htmlFor="size_sqft_max">
              <Input id="size_sqft_max" name="size_sqft_max" inputMode="numeric" placeholder="1200" />
            </Field>
            <Field label="Beds (min)" htmlFor="beds_min">
              <Input id="beds_min" name="beds_min" inputMode="decimal" placeholder="2" />
            </Field>
            <Field label="Baths (min)" htmlFor="baths_min">
              <Input id="baths_min" name="baths_min" inputMode="decimal" placeholder="2" />
            </Field>
            <Field label="Condition" htmlFor="condition">
              <Select id="condition" name="condition" defaultValue="">
                <option value="">Any</option>
                <option value="new">New / pre-construction</option>
                <option value="turnkey">Turnkey</option>
                <option value="reno_ok">Renovation OK</option>
              </Select>
            </Field>
            <Field label="Timeline to close" htmlFor="timeline">
              <Select id="timeline" name="timeline" defaultValue="">
                <option value="">Flexible</option>
                <option value="lt_30">Under 30 days</option>
                <option value="30_90">30–90 days</option>
                <option value="3_6mo">3–6 months</option>
                <option value="gt_6mo">6+ months</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Must-haves" htmlFor="must_haves">
              <Textarea id="must_haves" name="must_haves" placeholder="Parking, 2 beds, south-facing…" />
            </Field>
            <Field label="Nice-to-haves" htmlFor="nice_to_haves">
              <Textarea id="nice_to_haves" name="nice_to_haves" placeholder="Balcony, locker, gym…" />
            </Field>
          </div>
        </Section>

        <Section title="Verification" hint="A verified mandate (pre-approval + funds + signed representation) earns a badge, ranks higher, and is what listing-side brokers can be pitched against.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pre-approval status" htmlFor="pre_approval_status">
              <Select id="pre_approval_status" name="pre_approval_status" defaultValue="none">
                <option value="none">None</option>
                <option value="pre_qualified">Pre-qualified</option>
                <option value="pre_approved">Pre-approved</option>
              </Select>
            </Field>
            <Field label="Pre-approval amount (CAD)" htmlFor="pre_approval_amount">
              <Input id="pre_approval_amount" name="pre_approval_amount" inputMode="numeric" placeholder="850000" />
            </Field>
            <Field label="Lender" htmlFor="lender">
              <Input id="lender" name="lender" placeholder="e.g. RBC" />
            </Field>
            <Field label="Pre-approval expiry" htmlFor="pre_approval_expiry">
              <Input id="pre_approval_expiry" name="pre_approval_expiry" type="date" />
            </Field>
          </div>
          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="proof_of_funds" className="size-4 rounded border-slate-300" />
              Proof of funds / deposit capacity on file
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="rep_agreement_signed" className="size-4 rounded border-slate-300" />
              Signed buyer representation agreement on file
            </label>
          </div>
        </Section>

        <div className="flex items-center gap-3">
          <SubmitButton>Create mandate</SubmitButton>
          <Link href="/dashboard/buyer-mandates" className="text-sm text-slate-500 hover:text-slate-800">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Header() {
  return (
    <div>
      <Link href="/dashboard/buyer-mandates" className="text-sm text-brand-700 hover:underline">
        ← Buyer mandates
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        New buyer mandate
      </h1>
      <p className="mt-1 text-slate-500">
        Describe a hard-to-match buyer. Matching inventory surfaces to you
        automatically.
      </p>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
        <div className="mt-4">{children}</div>
      </CardBody>
    </Card>
  );
}
