import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Mail, Phone, Check, X, Clock } from "lucide-react";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPriceBand, isMandateVerified } from "@/lib/types";
import type { BuyerMandate } from "@/lib/types";
import { respondToConnect } from "../connect-actions";

type ConnectReq = {
  id: string;
  developer_user_id: string;
  status: "requested" | "accepted" | "declined" | "withdrawn";
  message: string | null;
  created_at: string;
};
type DevInfo = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  brokerage_name: string | null;
  email: string | null;
  phone: string | null;
};

export const metadata: Metadata = { title: "Buyer mandate" };
export const dynamic = "force-dynamic";

const PREAPPROVAL_LABEL: Record<string, string> = {
  none: "None",
  pre_qualified: "Pre-qualified",
  pre_approved: "Pre-approved",
};

export default async function MandateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserProfile();
  const { id } = await params;

  const supabase = await createClient();
  // RLS limits this to the submitting broker or an admin.
  const { data } = await supabase
    .from("buyer_mandates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const m = data as BuyerMandate;
  const verified = isMandateVerified(m);
  const band = formatPriceBand(m.price_min, m.price_max);

  // Incoming connect requests (RLS: only the mandate's broker or an admin).
  const { data: reqData } = await supabase
    .from("mandate_connect_requests")
    .select("id, developer_user_id, status, message, created_at")
    .eq("mandate_id", id)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: false });
  const requests = (reqData as ConnectReq[] | null) ?? [];

  // Developer identity for each request; contact only where accepted.
  const devById = new Map<string, DevInfo>();
  const devIds = [...new Set(requests.map((r) => r.developer_user_id))];
  if (devIds.length > 0) {
    const { data: devs } = await createAdminClient()
      .from("profiles")
      .select("id, first_name, last_name, brokerage_name, email, phone")
      .in("id", devIds);
    for (const d of (devs as DevInfo[]) ?? []) devById.set(d.id, d);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/buyer-mandates" className="text-sm text-brand-700 hover:underline">
          ← Buyer mandates
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{m.status}</Badge>
          {verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <ShieldCheck className="size-3.5" aria-hidden /> Verified
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-400">Unverified</span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {m.buyer_label || "Buyer mandate"}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Criteria
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Price" value={band} />
              <Detail label="Financing" value={cap(m.financing_type)} />
              <Detail label="Areas" value={m.location_areas} />
              <Detail label="Radius" value={m.location_radius_km ? `${m.location_radius_km} km` : null} />
              <Detail label="Property type" value={cap(m.property_type)} />
              <Detail label="Condition" value={cap(m.condition)} />
              <Detail
                label="Size"
                value={
                  m.size_sqft_min || m.size_sqft_max
                    ? `${m.size_sqft_min ?? "?"}–${m.size_sqft_max ?? "?"} sq ft`
                    : null
                }
              />
              <Detail label="Beds / baths" value={m.beds_min || m.baths_min ? `${m.beds_min ?? "?"} bd / ${m.baths_min ?? "?"} ba` : null} />
              <Detail label="Timeline" value={m.timeline} />
              <Detail label="Must-haves" value={m.must_haves} full />
              <Detail label="Nice-to-haves" value={m.nice_to_haves} full />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Verification
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Pre-approval" value={PREAPPROVAL_LABEL[m.pre_approval_status]} />
              <Detail label="Amount" value={m.pre_approval_amount ? formatPriceBand(m.pre_approval_amount, null) : null} />
              <Detail label="Lender" value={m.lender} />
              <Detail label="Expiry" value={m.pre_approval_expiry} />
              <Detail label="Proof of funds" value={m.proof_of_funds ? "On file" : "No"} />
              <Detail label="Rep agreement" value={m.rep_agreement_signed ? "Signed" : "No"} />
            </dl>
            <p className="mt-4 text-xs text-slate-400">
              Verification is self-reported for now; document upload &amp;
              automated checks are coming.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Incoming connect requests from developers */}
      <Card>
        <CardBody>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Connect requests ({requests.length})
          </h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-400">
              No developers have requested an intro on this mandate yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {requests.map((r) => {
                const dev = devById.get(r.developer_user_id);
                const devName =
                  [dev?.first_name, dev?.last_name].filter(Boolean).join(" ") ||
                  "A developer";
                return (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">
                          {devName}
                          {dev?.brokerage_name ? (
                            <span className="font-normal text-slate-400"> · {dev.brokerage_name}</span>
                          ) : null}
                        </p>
                        {r.message ? (
                          <p className="mt-1 text-sm text-slate-600">{r.message}</p>
                        ) : null}
                      </div>
                      {r.status === "requested" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <Clock className="size-3.5" aria-hidden /> Pending
                        </span>
                      ) : r.status === "accepted" ? (
                        <Badge tone="success">Accepted</Badge>
                      ) : (
                        <Badge tone="neutral">Declined</Badge>
                      )}
                    </div>

                    {r.status === "requested" ? (
                      <div className="mt-3 flex gap-2">
                        <form action={respondToConnect}>
                          <input type="hidden" name="request_id" value={r.id} />
                          <input type="hidden" name="mandate_id" value={id} />
                          <input type="hidden" name="decision" value="accepted" />
                          <Button type="submit" size="sm">
                            <Check className="size-4" aria-hidden /> Accept &amp; share contact
                          </Button>
                        </form>
                        <form action={respondToConnect}>
                          <input type="hidden" name="request_id" value={r.id} />
                          <input type="hidden" name="mandate_id" value={id} />
                          <input type="hidden" name="decision" value="declined" />
                          <Button type="submit" size="sm" variant="secondary">
                            <X className="size-4" aria-hidden /> Decline
                          </Button>
                        </form>
                      </div>
                    ) : r.status === "accepted" ? (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-700">
                        {dev?.email ? (
                          <a href={`mailto:${dev.email}`} className="inline-flex items-center gap-1 hover:underline">
                            <Mail className="size-3.5" aria-hidden /> {dev.email}
                          </a>
                        ) : null}
                        {dev?.phone ? (
                          <a href={`tel:${dev.phone}`} className="inline-flex items-center gap-1 hover:underline">
                            <Phone className="size-3.5" aria-hidden /> {dev.phone}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function cap(v: string | null): string | null {
  if (!v) return null;
  return v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}
