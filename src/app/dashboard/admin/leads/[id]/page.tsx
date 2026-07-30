import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { LEAD_STATUSES, LEAD_STATUS_META, leadStatusMeta } from "@/lib/leads";
import { setLeadStatus, pullLeadToAdmin, assignLeadToRealtor } from "../actions";

export const metadata: Metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  project_id: string | null;
  public_project_page_id: string | null;
  assigned_realtor_profile_id: string | null;
  referred_by_profile_id: string | null;
  lead_name: string;
  lead_email: string;
  lead_phone: string | null;
  message: string | null;
  is_realtor: boolean | null;
  status: string | null;
  first_responded_at: string | null;
  created_at: string;
}
interface Prof {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  brokerage_name: string | null;
}

const profName = (p: Prof | undefined | null): string =>
  p
    ? [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Agent"
    : "Unknown agent";

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

export default async function AdminLeadDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_leads")
    .select(
      "id, project_id, public_project_page_id, assigned_realtor_profile_id, referred_by_profile_id, lead_name, lead_email, lead_phone, message, is_realtor, status, first_responded_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  const lead = (data as Lead | null) ?? null;
  if (!lead) notFound();

  const profileIds = [
    lead.assigned_realtor_profile_id,
    lead.referred_by_profile_id,
  ].filter(Boolean) as string[];

  const [{ data: projData }, { data: profData }, { data: realtorData }] =
    await Promise.all([
      lead.project_id
        ? supabase
            .from("projects")
            .select("id, project_name, slug")
            .eq("id", lead.project_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      profileIds.length
        ? supabase
            .from("profiles")
            .select("id, first_name, last_name, email, brokerage_name")
            .in("id", profileIds)
        : Promise.resolve({ data: [] as Prof[] }),
      // The assignment dropdown: every APPROVED realtor.
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email, brokerage_name")
        .eq("role", "realtor")
        .eq("verification_status", "approved")
        .order("first_name")
        .limit(300),
    ]);
  const project = projData as { id: string; project_name: string; slug: string } | null;
  const profById = new Map(((profData as Prof[] | null) ?? []).map((p) => [p.id, p]));
  const realtors = (realtorData as Prof[] | null) ?? [];
  const assigned = lead.assigned_realtor_profile_id
    ? profById.get(lead.assigned_realtor_profile_id)
    : null;
  const referrer = lead.referred_by_profile_id
    ? profById.get(lead.referred_by_profile_id)
    : null;
  const sm = leadStatusMeta(lead.status);

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/admin/leads"
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            ← All leads
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {lead.lead_name}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Registered {new Date(lead.created_at).toLocaleString("en-CA")}
            {lead.first_responded_at
              ? ` · first worked ${new Date(lead.first_responded_at).toLocaleString("en-CA")}`
              : " · not yet worked"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={lead.is_realtor ? "brand" : "neutral"}>
            {lead.is_realtor ? "Agent — recruit" : "Consumer"}
          </Badge>
          <Badge tone={sm.tone}>{sm.label}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">Contact</h3>
              <p className="text-sm">
                <a
                  href={`mailto:${encodeURIComponent(lead.lead_email)}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {lead.lead_email}
                </a>
                {lead.lead_phone ? (
                  <>
                    {" · "}
                    <a
                      href={`tel:${lead.lead_phone.replace(/[^+\d]/g, "")}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {lead.lead_phone}
                    </a>
                  </>
                ) : (
                  <span className="text-slate-400"> · no phone</span>
                )}
              </p>
              {lead.message ? (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {lead.message}
                </p>
              ) : null}
              {project ? (
                <p className="text-sm text-slate-500">
                  Project:{" "}
                  <Link
                    href={`/dashboard/admin/projects/${project.id}`}
                    className="text-brand-700 hover:underline"
                  >
                    {project.project_name}
                  </Link>{" "}
                  <a
                    href={`/projects/${project.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:underline"
                  >
                    (public page ↗)
                  </a>
                </p>
              ) : null}
              {referrer ? (
                <p className="text-sm text-slate-500">
                  Arrived via {profName(referrer)}&apos;s referral link.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-ink">Status</h3>
              <form action={setLeadStatus} className="mt-2 flex items-end gap-2">
                <input type="hidden" name="lead_id" value={lead.id} />
                <input type="hidden" name="back_to" value="detail" />
                <Select name="status" defaultValue={lead.status ?? "new"} className="w-auto">
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_META[s].label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" variant="secondary">
                  Update
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Assignment</h3>
              {assigned ? (
                <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-sm">
                  <p className="font-medium text-slate-800">{profName(assigned)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[assigned.brokerage_name, assigned.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm">
                  <Badge tone="warning">Admin pool · LIQWD</Badge>
                </p>
              )}
            </div>

            <form action={assignLeadToRealtor} className="space-y-2">
              <input type="hidden" name="lead_id" value={lead.id} />
              <label
                htmlFor="assign_profile"
                className="block text-sm font-medium text-slate-700"
              >
                {assigned ? "Reassign to" : "Assign to an approved agent"}
              </label>
              <Select id="assign_profile" name="profile_id" defaultValue="">
                <option value="" disabled>
                  Pick an agent…
                </option>
                {realtors.map((r) => (
                  <option key={r.id} value={r.id}>
                    {profName(r)}
                    {r.brokerage_name ? ` — ${r.brokerage_name}` : ""}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="sm">
                {assigned ? "Reassign & notify" : "Assign & notify"}
              </Button>
              <p className="text-xs text-slate-400">
                The agent gets the lead by email immediately (reply-to goes to
                the lead). Only approved agents can receive leads.
              </p>
            </form>

            {assigned ? (
              <form action={pullLeadToAdmin} className="border-t border-slate-100 pt-3">
                <input type="hidden" name="lead_id" value={lead.id} />
                <input type="hidden" name="back_to" value="detail" />
                <ConfirmButton
                  type="submit"
                  size="sm"
                  variant="ghost"
                  title="Remove the assigned agent?"
                  message={`This unassigns ${profName(assigned)} — LIQWD takes over the follow-up. The agent isn't notified.`}
                  confirmLabel="Remove agent"
                >
                  Remove agent (pull to pool)
                </ConfirmButton>
              </form>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
