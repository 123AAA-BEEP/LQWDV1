import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TITLE_LABELS,
  VERIFICATION_LABELS,
  type RealtorTitle,
  type VerificationStatus,
} from "@/lib/types";
import { setRealtorTier } from "../actions";

export const metadata: Metadata = { title: "Realtor details" };
export const dynamic = "force-dynamic";

/** Every field we intake on a profile — surfaced read-only for admin review. */
interface ProfileRow {
  id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  title: RealtorTitle | null;
  email: string | null;
  phone: string | null;
  brokerage_name: string | null;
  reco_registration_number: string | null;
  reco_expiry: string | null;
  reco_verified_at: string | null;
  reco_verification_method: string | null;
  verification_status: VerificationStatus;
  realtor_tier: string;
  plan: string;
  pro_until: string | null;
  developer_mandate_access: boolean;
  mandate_connect_credits: number;
  is_public_profile_enabled: boolean;
  referral_code: string | null;
  referred_by_profile_id: string | null;
  bio_short: string | null;
  service_area: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

interface VerificationRow {
  id: string;
  reco_registration_number: string | null;
  brokerage_name_submitted: string | null;
  notes: string | null;
  status: VerificationStatus;
  created_at: string;
  reviewed_at: string | null;
}

const DASH = "—";

function text(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return DASH;
  return String(v);
}
function yesNo(v: boolean | null | undefined): string {
  return v ? "Yes" : "No";
}
function fmtDate(v: string | null | undefined): string {
  if (!v) return DASH;
  return new Date(v).toLocaleDateString("en-CA");
}
function fmtDateTime(v: string | null | undefined): string {
  if (!v) return DASH;
  return new Date(v).toLocaleString("en-CA");
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
      </CardBody>
    </Card>
  );
}

export default async function RealtorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Admin RLS lets admins read every profile; the admin layout already gates
  // this route, so a plain session client is sufficient.
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const p = data as unknown as ProfileRow;

  const { data: vreqs } = await supabase
    .from("verification_requests")
    .select(
      "id, reco_registration_number, brokerage_name_submitted, notes, status, created_at, reviewed_at",
    )
    .eq("profile_id", id)
    .order("created_at", { ascending: false });
  const requests = (vreqs as unknown as VerificationRow[]) ?? [];

  const name =
    [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unnamed";
  const isUltra = p.realtor_tier === "ultra";
  const isRealtor = p.role === "realtor";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/realtors"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to realtors
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{text(p.email)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={verificationBadgeTone(p.verification_status)}>
            {VERIFICATION_LABELS[p.verification_status]}
          </Badge>
          {isRealtor ? (
            <Badge tone={isUltra ? "brand" : "neutral"}>
              {isUltra ? "Ultra" : "Standard"}
            </Badge>
          ) : (
            <Badge tone="neutral">{text(p.role)}</Badge>
          )}
        </div>
      </div>

      <Section title="Contact">
        <Field label="First name" value={text(p.first_name)} />
        <Field label="Last name" value={text(p.last_name)} />
        <Field label="Display name" value={text(p.display_name)} />
        <Field
          label="Title"
          value={p.title ? TITLE_LABELS[p.title] : DASH}
        />
        <Field
          label="Email"
          value={
            p.email ? (
              <a className="text-brand-700 hover:underline" href={`mailto:${p.email}`}>
                {p.email}
              </a>
            ) : (
              DASH
            )
          }
        />
        <Field
          label="Phone"
          value={
            p.phone ? (
              <a className="text-brand-700 hover:underline" href={`tel:${p.phone}`}>
                {p.phone}
              </a>
            ) : (
              DASH
            )
          }
        />
      </Section>

      <Section title="Brokerage & role">
        <Field label="Role" value={text(p.role)} />
        <Field label="Brokerage" value={text(p.brokerage_name)} />
        <Field label="Service area" value={text(p.service_area)} />
        <Field label="Public profile" value={yesNo(p.is_public_profile_enabled)} />
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Bio</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
            {text(p.bio_short)}
          </dd>
        </div>
      </Section>

      <Section title="Verification & RECO">
        <Field
          label="Verification status"
          value={
            <Badge tone={verificationBadgeTone(p.verification_status)}>
              {VERIFICATION_LABELS[p.verification_status]}
            </Badge>
          }
        />
        <Field label="RECO #" value={text(p.reco_registration_number)} />
        <Field label="RECO expiry" value={fmtDate(p.reco_expiry)} />
        <Field label="RECO verified at" value={fmtDateTime(p.reco_verified_at)} />
        <Field
          label="Verification method"
          value={text(p.reco_verification_method)}
        />
      </Section>

      <Section title="Account & access">
        <Field label="Realtor tier" value={text(p.realtor_tier)} />
        <Field label="Plan" value={text(p.plan)} />
        <Field label="Pro until" value={fmtDateTime(p.pro_until)} />
        <Field
          label="Developer mandate access"
          value={yesNo(p.developer_mandate_access)}
        />
        <Field
          label="Mandate connect credits"
          value={text(p.mandate_connect_credits)}
        />
      </Section>

      <Section title="Referrals">
        <Field label="Referral code" value={text(p.referral_code)} />
        <Field label="Referred by" value={text(p.referred_by_profile_id)} />
      </Section>

      <Section title="Billing">
        <Field label="Stripe customer ID" value={text(p.stripe_customer_id)} />
        <Field
          label="Stripe subscription ID"
          value={text(p.stripe_subscription_id)}
        />
      </Section>

      <Section title="Media">
        <Field
          label="Avatar URL"
          value={
            p.avatar_url ? (
              <a
                className="text-brand-700 hover:underline"
                href={p.avatar_url}
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
            ) : (
              DASH
            )
          }
        />
        <Field
          label="Logo URL"
          value={
            p.logo_url ? (
              <a
                className="text-brand-700 hover:underline"
                href={p.logo_url}
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
            ) : (
              DASH
            )
          }
        />
      </Section>

      <Section title="System">
        <Field label="Profile ID" value={text(p.id)} />
        <Field label="Created" value={fmtDateTime(p.created_at)} />
        <Field label="Updated" value={fmtDateTime(p.updated_at)} />
      </Section>

      {/* Verification submission history (the RECO request rows). */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Verification requests ({requests.length})
          </h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">
              No RECO request on file (may have been approved directly or via the
              instant certificate path).
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((r) => (
                <div key={r.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={verificationBadgeTone(r.status)}>
                      {VERIFICATION_LABELS[r.status]}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Submitted {fmtDate(r.created_at)}
                      {r.reviewed_at
                        ? ` · Reviewed ${fmtDate(r.reviewed_at)}`
                        : ""}
                    </span>
                  </div>
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <Field label="RECO #" value={text(r.reco_registration_number)} />
                    <Field
                      label="Brokerage (submitted)"
                      value={text(r.brokerage_name_submitted)}
                    />
                    {r.notes ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-slate-400">
                          Notes
                        </dt>
                        <dd className="mt-0.5 text-sm text-slate-700">{r.notes}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Deal Desk tier control — only meaningful for approved realtors. */}
      {isRealtor ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">
                Deal Desk tier
              </p>
              <p className="text-xs text-slate-500">
                Ultra unlocks RFP invitations &amp; responses. Currently{" "}
                <span className="font-medium">{isUltra ? "Ultra" : "Standard"}</span>.
              </p>
            </div>
            <form action={setRealtorTier}>
              <input type="hidden" name="profile_id" value={p.id} />
              <input
                type="hidden"
                name="tier"
                value={isUltra ? "standard" : "ultra"}
              />
              <Button
                type="submit"
                size="sm"
                variant={isUltra ? "secondary" : "primary"}
              >
                {isUltra ? "Demote to standard" : "Promote to Ultra"}
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
