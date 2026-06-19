import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { submitRentalReferral } from "../actions";

export const metadata: Metadata = { title: "Refer a buyer" };
export const dynamic = "force-dynamic";

const cad = (n: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

function feeLabel(type: string | null, value: number | null): string | null {
  if (!type || value == null) return null;
  if (type === "months_rent")
    return value === 1 ? "1 month's rent" : `${value} months' rent`;
  if (type === "percent_first_year") return `${value}% of first-year rent`;
  if (type === "flat") return `${cad(value)} flat`;
  return null;
}

interface Mandate {
  id: string;
  buyer_label: string | null;
  status: string;
}

export default async function ReferBuyer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireUserProfile();

  if (!isApproved(profile)) {
    return (
      <Card>
        <CardBody className="space-y-3 text-sm text-slate-600">
          <p>Get verified to refer clients and earn referral income.</p>
          <ButtonLink href="/dashboard/verify">Start verification</ButtonLink>
        </CardBody>
      </Card>
    );
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("broker_projects_view")
    .select("id, project_name, city, neighbourhood, price_from_public, price_to_public")
    .eq("id", id)
    .eq("record_status", "published")
    .maybeSingle();
  if (!project) notFound();

  const { data: terms } = await supabase
    .from("project_rental_referral_terms")
    .select("referral_fee_type, referral_fee_value, referral_fee_notes, payout_terms")
    .eq("project_id", id)
    .maybeSingle();

  const { data: mandatesRaw } = await supabase
    .from("buyer_mandates")
    .select("id, buyer_label, status")
    .order("created_at", { ascending: false });
  const mandates = (mandatesRaw as Mandate[] | null) ?? [];

  const fee = feeLabel(
    terms?.referral_fee_type ?? null,
    terms?.referral_fee_value ?? null,
  );
  const rent = project.price_from_public ?? project.price_to_public;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/quick-wins"
        className="text-sm text-brand-700 hover:underline"
      >
        ← Quick Wins
      </Link>

      <Card>
        <CardBody className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">
              {project.project_name}
            </h2>
            <Badge tone="success">{fee ?? "Pays a referral fee"}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {[project.neighbourhood, project.city].filter(Boolean).join(", ")}
            {rent ? ` · ${cad(rent)}/mo` : ""}
          </p>
          {terms?.payout_terms ? (
            <p className="pt-1 text-xs text-slate-500">{terms.payout_terms}</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Refer a client</h3>
          <p className="mt-1 text-sm text-slate-500">
            Send the building&rsquo;s leasing team your client&rsquo;s details.
            They take it from here — you get paid when your client signs.
          </p>
          <form action={submitRentalReferral} className="mt-4 space-y-4">
            <input type="hidden" name="project_id" value={id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client first name" htmlFor="client_first_name">
                <Input id="client_first_name" name="client_first_name" />
              </Field>
              <Field label="Client last name" htmlFor="client_last_name">
                <Input id="client_last_name" name="client_last_name" />
              </Field>
              <Field label="Client email" htmlFor="client_email">
                <Input
                  id="client_email"
                  name="client_email"
                  type="email"
                  required
                />
              </Field>
              <Field label="Client phone" htmlFor="client_phone">
                <Input id="client_phone" name="client_phone" type="tel" />
              </Field>
            </div>
            {mandates.length > 0 ? (
              <Field
                label="Link a buyer mandate (optional)"
                htmlFor="mandate_id"
                hint="Associate this referral with one of your saved buyers."
              >
                <Select id="mandate_id" name="mandate_id" defaultValue="">
                  <option value="">— None —</option>
                  {mandates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.buyer_label || "Untitled mandate"} ({m.status})
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field
              label="Note to the leasing team (optional)"
              htmlFor="message"
            >
              <Textarea
                id="message"
                name="message"
                placeholder="Anything helpful — timing, unit preferences, budget…"
              />
            </Field>
            <p className="text-xs text-slate-400">
              By referring, you confirm your client agreed to be contacted by the
              building&rsquo;s leasing team. The referral fee is paid to your
              brokerage on a signed lease.
            </p>
            <Button type="submit">Send referral</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
