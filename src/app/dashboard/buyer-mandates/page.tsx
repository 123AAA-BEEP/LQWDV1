import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Plus, ShieldCheck, Mail, Phone, Clock, X } from "lucide-react";
import {
  requireUserProfile,
  isApproved,
  isPro,
  isAdmin,
  isDeveloper,
  developerCanConnect,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { formatPriceBand, isMandateVerified } from "@/lib/types";
import type { BuyerMandate } from "@/lib/types";
import { requestConnect, withdrawConnect } from "./connect-actions";

type ConnectStatus = "requested" | "accepted" | "declined" | "withdrawn";
type Contact = { email: string | null; phone: string | null };

export const metadata: Metadata = { title: "Buyer mandates" };
export const dynamic = "force-dynamic";

const STATUS_TONE = {
  draft: "neutral",
  active: "brand",
  matched: "success",
  closed: "neutral",
} as const;

interface Row extends BuyerMandate {
  broker?: { first_name: string | null; last_name: string | null } | null;
}

export default async function BuyerMandatesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; connect?: string }>;
}) {
  const { profile, userId } = await requireUserProfile();
  const { created, connect } = await searchParams;
  const admin = isAdmin(profile);

  if (!admin && !isApproved(profile) && !isDeveloper(profile)) {
    return (
      <div className="space-y-6">
        <Header isPro={false} canCreate={false} />
        <VerificationRequired />
      </div>
    );
  }

  // Developers browse the privacy-safe marketplace (criteria + Verified badge
  // + broker identity; contact exchange is the paywalled "connect", Stage 2b).
  if (isDeveloper(profile) && !admin) {
    const supabase = await createClient();
    const [{ data: viewRows }, { data: myReqs }] = await Promise.all([
      supabase
        .from("buyer_mandates_developer_view")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("mandate_connect_requests")
        .select("id, mandate_id, status")
        .eq("developer_user_id", userId),
    ]);
    const mandates = (viewRows as unknown as DeveloperRow[] | null) ?? [];
    const reqByMandate = new Map(
      ((myReqs as { id: string; mandate_id: string; status: ConnectStatus }[]) ?? []).map(
        (r) => [r.mandate_id, r],
      ),
    );

    // Reveal broker contact only where this developer's request was accepted.
    const acceptedBrokerIds = mandates
      .filter((m) => reqByMandate.get(m.id)?.status === "accepted")
      .map((m) => m.broker_id);
    const contactById = new Map<string, Contact>();
    if (acceptedBrokerIds.length > 0) {
      const { data: contacts } = await createAdminClient()
        .from("profiles")
        .select("id, email, phone")
        .in("id", acceptedBrokerIds);
      for (const c of (contacts as ({ id: string } & Contact)[]) ?? []) {
        contactById.set(c.id, { email: c.email, phone: c.phone });
      }
    }

    const canConnect = developerCanConnect(profile);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Ready buyers
            </h1>
            <p className="mt-1 text-slate-500">
              Verified buyer demand from agents — match your inventory to buyers
              who are ready now. Verified mandates are backed by pre-approval,
              funds, and a signed agreement.
            </p>
          </div>
          <ButtonLink href="/dashboard/developer" variant="secondary" size="sm">
            {canConnect ? "Manage connections" : "Unlock connections"}
          </ButtonLink>
        </div>

        {connect === "sent" ? (
          <Notice tone="success">Request sent — we&apos;ll notify you when the broker responds.</Notice>
        ) : null}
        {connect === "exists" ? (
          <Notice tone="info">You&apos;ve already requested a connect on that mandate.</Notice>
        ) : null}
        {!canConnect ? (
          <Notice tone="warning">
            You can browse buyer demand freely. To reach an agent, you&apos;ll need
            a connection — <Link href="/dashboard/developer" className="font-medium underline">unlock here</Link>.
          </Notice>
        ) : null}

        {mandates.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No active buyer mandates right now. Check back soon.
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mandates.map((m) => (
              <DeveloperMandateCard
                key={m.id}
                m={m}
                request={reqByMandate.get(m.id) ?? null}
                contact={contactById.get(m.broker_id) ?? null}
                canConnect={canConnect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Approved realtor without Pro → upsell.
  if (!admin && !isPro(profile)) {
    return (
      <div className="space-y-6">
        <Header isPro={false} canCreate={false} />
        <Card>
          <CardBody className="text-center">
            <h2 className="text-lg font-semibold text-ink">A Pro feature</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Buyer Mandates are part of LIQWD Pro. Upgrade to submit a mandate
              and let matching inventory find your buyer automatically.
            </p>
            <div className="mt-4">
              <ButtonLink href="/dashboard/upgrade" size="sm">
                Upgrade to Pro
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  let request = supabase
    .from("buyer_mandates")
    .select(
      admin
        ? "*, broker:profiles!submitted_by_user_id(first_name,last_name)"
        : "*",
    )
    .order("created_at", { ascending: false });
  if (!admin) request = request.eq("submitted_by_user_id", userId);

  const { data } = await request;
  const rows = (data as unknown as Row[] | null) ?? [];

  return (
    <div className="space-y-6">
      <Header isPro={isPro(profile)} canCreate={!admin} />

      {created ? <Notice tone="success">Mandate created.</Notice> : null}

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            {admin
              ? "No buyer mandates submitted yet."
              : "You haven't created any buyer mandates yet."}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => {
            const verified = isMandateVerified(m);
            const band = formatPriceBand(m.price_min, m.price_max);
            const brokerName = m.broker
              ? [m.broker.first_name, m.broker.last_name].filter(Boolean).join(" ")
              : null;
            return (
              <Card key={m.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/buyer-mandates/${m.id}`}
                      className="font-medium text-slate-800 hover:underline"
                    >
                      {m.buyer_label || "Buyer mandate"}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {[
                        band,
                        m.location_areas,
                        m.property_type,
                        admin && brokerName ? `by ${brokerName}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                        <ShieldCheck className="size-3.5" aria-hidden /> Verified
                      </span>
                    ) : null}
                    <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DeveloperRow {
  id: string;
  location_areas: string | null;
  price_min: number | null;
  price_max: number | null;
  property_type: string | null;
  size_sqft_min: number | null;
  size_sqft_max: number | null;
  beds_min: number | null;
  baths_min: number | null;
  timeline: string | null;
  must_haves: string | null;
  verified: boolean;
  broker_id: string;
  broker_first_name: string | null;
  broker_last_name: string | null;
  broker_brokerage: string | null;
}

function DeveloperMandateCard({
  m,
  request,
  contact,
  canConnect,
}: {
  m: DeveloperRow;
  request: { id: string; status: ConnectStatus } | null;
  contact: Contact | null;
  canConnect: boolean;
}) {
  const band = formatPriceBand(m.price_min, m.price_max);
  const broker =
    [m.broker_first_name, m.broker_last_name].filter(Boolean).join(" ") || "A broker";
  const size =
    m.size_sqft_min || m.size_sqft_max
      ? `${m.size_sqft_min ?? "?"}–${m.size_sqft_max ?? "?"} sq ft`
      : null;
  const beds = m.beds_min ? `${m.beds_min}+ bd` : null;
  return (
    <Card className="h-full">
      <CardBody className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="font-medium text-ink">{m.location_areas || "Buyer looking"}</span>
          {m.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
              <ShieldCheck className="size-3.5" aria-hidden /> Verified
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {[band, m.property_type, size, beds, m.timeline].filter(Boolean).join(" · ")}
        </p>
        {m.must_haves ? (
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Must-haves:</span> {m.must_haves}
          </p>
        ) : null}
        <p className="mt-3 flex-1 text-xs text-slate-400">
          via {broker}
          {m.broker_brokerage ? ` · ${m.broker_brokerage}` : ""}
        </p>

        <div className="mt-4 border-t border-slate-100 pt-3">
          {request?.status === "accepted" ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm">
              <p className="font-medium text-emerald-800">Connected — reach out:</p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-emerald-700">
                {contact?.email ? (
                  <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:underline">
                    <Mail className="size-3.5" aria-hidden /> {contact.email}
                  </a>
                ) : null}
                {contact?.phone ? (
                  <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:underline">
                    <Phone className="size-3.5" aria-hidden /> {contact.phone}
                  </a>
                ) : null}
                {!contact?.email && !contact?.phone ? "Contact on file with the broker." : null}
              </p>
            </div>
          ) : request?.status === "requested" ? (
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                <Clock className="size-3.5" aria-hidden /> Request pending
              </span>
              <form action={withdrawConnect}>
                <input type="hidden" name="request_id" value={request.id} />
                <button type="submit" className="text-xs font-medium text-slate-500 hover:text-slate-800">
                  Withdraw
                </button>
              </form>
            </div>
          ) : request?.status === "declined" ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <X className="size-3.5" aria-hidden /> Not a match this time
            </span>
          ) : canConnect ? (
            <form action={requestConnect}>
              <input type="hidden" name="mandate_id" value={m.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Request connect
              </button>
            </form>
          ) : (
            <Link
              href="/dashboard/developer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Lock className="size-3.5" aria-hidden /> Get access to connect
            </Link>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function Header({ isPro, canCreate }: { isPro: boolean; canCreate: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Buyer mandates
        </h1>
        <p className="mt-1 text-slate-500">
          Submit a hard-to-match buyer and let matching inventory surface to you.
        </p>
      </div>
      {canCreate && isPro ? (
        <ButtonLink href="/dashboard/buyer-mandates/new" size="sm">
          <Plus className="size-4" aria-hidden /> New mandate
        </ButtonLink>
      ) : null}
    </div>
  );
}
