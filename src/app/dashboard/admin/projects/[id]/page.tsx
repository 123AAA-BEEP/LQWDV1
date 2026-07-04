import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { RECORD_STATUS, RECORD_STATUS_OPTIONS } from "@/lib/status";
import type { RecordStatus } from "@/lib/status";
import {
  updateProject,
  saveCommercials,
  savePublicPage,
  publishProject,
  unpublishProject,
  saveRentalReferralTerms,
  addBrokerPortal,
  removeBrokerPortal,
  setBrokerPortalFeatured,
  approveBrokerPortal,
  rejectBrokerPortal,
} from "./actions";
import { ProjectUploads } from "./uploads";
import { AgentSelect } from "./agent-select";
import { SeoFields } from "./seo-fields";

export const metadata: Metadata = { title: "Edit project" };
export const dynamic = "force-dynamic";
// Headroom for inline SEO generation on publish.
export const maxDuration = 60;

const UPLOAD_MESSAGES: Record<string, string> = {
  "media-added": "Image uploaded.",
  "floorplan-added": "Floorplan added.",
  "document-added": "Document uploaded.",
  "public-saved": "Public page saved.",
};

export default async function AdminProjectEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: page } = await supabase
    .from("public_project_pages")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();

  // Broker-only commercial terms (admin-writable).
  const { data: commercials } = await supabase
    .from("project_private_commercials")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();
  const tri = (v: boolean | null | undefined) =>
    v === true ? "true" : v === false ? "false" : "";

  // PBR rental referral terms (admin-writable; broker-readable).
  const { data: referral } = await supabase
    .from("project_rental_referral_terms")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();

  // Broker portals (direct links to the builder's portal/price list/worksheets).
  const { data: portals } = await supabase
    .from("project_broker_portals")
    .select(
      "id, portal_name, portal_type, url, access_notes, is_primary, is_active, is_featured, status, submitter:profiles!added_by_user_id(first_name,last_name,email)",
    )
    .eq("project_id", id)
    .order("is_primary", { ascending: false });

  // Click counts per portal (the ad-product metric).
  const portalIds = ((portals as { id: string }[] | null) ?? []).map((p) => p.id);
  const clickCounts = new Map<string, number>();
  if (portalIds.length) {
    const { data: ev } = await supabase
      .from("broker_portal_events")
      .select("portal_id")
      .eq("event_type", "click")
      .in("portal_id", portalIds);
    for (const e of (ev as { portal_id: string }[] | null) ?? []) {
      clickCounts.set(e.portal_id, (clickCounts.get(e.portal_id) ?? 0) + 1);
    }
  }

  type PortalRow = {
    id: string;
    portal_name: string;
    portal_type: string;
    url: string | null;
    access_notes: string | null;
    is_primary: boolean;
    is_active: boolean;
    is_featured: boolean;
    status: string;
    submitter: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
  };
  const allPortals = (portals as PortalRow[] | null) ?? [];
  // Realtor suggestions awaiting review vs. live (admin-approved) portals.
  const pendingPortals = allPortals.filter((p) => p.status === "pending");
  const livePortals = allPortals.filter(
    (p) => p.status !== "pending" && p.status !== "rejected",
  );

  // All realtors are assignable; the editor flags any who aren't approved +
  // public-profile-enabled (their card won't render on the public page).
  const { data: realtors } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, brokerage_name, verification_status, is_public_profile_enabled",
    )
    .eq("role", "realtor")
    .order("last_name", { ascending: true });
  const agentOptions = (
    (realtors ?? []) as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      brokerage_name: string | null;
      verification_status: string;
      is_public_profile_enabled: boolean;
    }[]
  ).map((r) => {
    const name =
      [r.first_name, r.last_name].filter(Boolean).join(" ") || "Unnamed agent";
    const eligible =
      r.verification_status === "approved" && r.is_public_profile_enabled;
    const suffix = eligible
      ? ""
      : r.verification_status !== "approved"
        ? ` (${r.verification_status})`
        : " (profile not public)";
    return {
      id: r.id,
      label: `${name}${r.brokerage_name ? ` — ${r.brokerage_name}` : ""}${suffix}`,
      eligible,
    };
  });

  // Upload-managed assets.
  const [{ data: media }, { data: floorplans }, { data: documents }] =
    await Promise.all([
      supabase
        .from("project_media")
        .select("id, url, alt_text")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_floorplans")
        .select("id, plan_name, unit_type, sqft_interior, price_public, floorplan_image_url")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_documents")
        .select("id, title, document_type, file_url, created_at")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
    ]);

  // Short-lived signed URLs for the PRIVATE documents bucket.
  const docPaths = (documents ?? []).map((d) => d.file_url as string);
  const signed = docPaths.length
    ? (
        await supabase.storage
          .from("project-documents")
          .createSignedUrls(docPaths, 3600)
      ).data ?? []
    : [];
  const signedByPath = new Map(
    signed.map((s) => [s.path ?? "", s.signedUrl]),
  );

  const recordStatus = project.record_status as RecordStatus;
  const isLive =
    project.public_page_enabled &&
    project.record_status === "published" &&
    (page?.is_active ?? false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/admin/projects"
            className="text-sm text-brand-700 hover:underline"
          >
            ← All projects
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            {project.project_name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <Badge tone="success">Live</Badge>
          ) : (
            <Badge tone="neutral">Not public</Badge>
          )}
          <Badge tone={RECORD_STATUS[recordStatus].tone}>
            {RECORD_STATUS[recordStatus].label}
          </Badge>
        </div>
      </div>

      {message && UPLOAD_MESSAGES[message] ? (
        <Notice tone="success">{UPLOAD_MESSAGES[message]}</Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* Section jump-nav — this editor is long; give admins a map. */}
      <nav
        aria-label="Editor sections"
        className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-1.5 border-b border-slate-200 bg-white/95 px-1 py-2 text-xs font-medium backdrop-blur"
      >
        {[
          ["#publish", "Publish"],
          ["#canonical", "Canonical"],
          ["#commission", "Commission"],
          ["#rental", "Rental terms"],
          ["#portals", "Portals"],
          ["#public-content", "Public page"],
          ["#uploads", "Uploads"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-brand-300 hover:text-brand-700"
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Publish controls */}
      <Card id="publish" className="scroll-mt-14">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-ink">Public page</h3>
            <p className="text-sm text-slate-500">
              {isLive
                ? "This project is visible on its public page."
                : "Publishing makes the public, SEO-safe page live."}
            </p>
            {isLive && page ? (
              <Link
                href={`/projects/${page.slug}`}
                className="text-xs text-brand-700 hover:underline"
                target="_blank"
              >
                View public page →
              </Link>
            ) : null}
          </div>
          {isLive ? (
            <form action={unpublishProject}>
              <input type="hidden" name="project_id" value={id} />
              <SubmitButton variant="secondary" pendingLabel="Unpublishing…">
                Unpublish
              </SubmitButton>
            </form>
          ) : (
            <form action={publishProject}>
              <input type="hidden" name="project_id" value={id} />
              <SubmitButton pendingLabel="Publishing…">Publish</SubmitButton>
            </form>
          )}
        </CardBody>
      </Card>

      {/* Canonical fields */}
      <Card id="canonical" className="scroll-mt-14">
        <CardBody>
          <h3 className="font-semibold text-ink">Canonical project</h3>
          <form action={updateProject} className="mt-4 space-y-4">
            <input type="hidden" name="project_id" value={id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" htmlFor="project_name">
                <Input
                  id="project_name"
                  name="project_name"
                  defaultValue={project.project_name ?? ""}
                  required
                />
              </Field>
              <Field label="Builder / developer" htmlFor="builder_name">
                <Input
                  id="builder_name"
                  name="builder_name"
                  defaultValue={project.builder_name ?? ""}
                />
              </Field>
              <Field label="City" htmlFor="city">
                <Input
                  id="city"
                  name="city"
                  defaultValue={project.city ?? ""}
                />
              </Field>
              <Field label="Street address" htmlFor="address_full">
                <Input
                  id="address_full"
                  name="address_full"
                  placeholder="e.g. 4630 Kingston Road"
                  defaultValue={project.address_full ?? ""}
                />
              </Field>
              <Field label="Province / state" htmlFor="province">
                <Input
                  id="province"
                  name="province"
                  placeholder="e.g. Ontario, Florida"
                  defaultValue={project.province ?? ""}
                />
              </Field>
              <Field label="Occupancy" htmlFor="occupancy_estimate_text">
                <Input
                  id="occupancy_estimate_text"
                  name="occupancy_estimate_text"
                  defaultValue={project.occupancy_estimate_text ?? ""}
                />
              </Field>
              <Field label="Sales status" htmlFor="sales_status">
                <Select
                  id="sales_status"
                  name="sales_status"
                  defaultValue={project.sales_status ?? ""}
                >
                  <option value="">—</option>
                  {[
                    "coming_soon",
                    "selling",
                    "paused",
                    "sold_out",
                    "completed",
                    "unknown",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Construction status" htmlFor="construction_status">
                <Select
                  id="construction_status"
                  name="construction_status"
                  defaultValue={project.construction_status ?? ""}
                >
                  <option value="">—</option>
                  {[
                    "preconstruction",
                    "under_construction",
                    "completed",
                    "unknown",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Listing type" htmlFor="listing_type">
                <Select
                  id="listing_type"
                  name="listing_type"
                  defaultValue={project.listing_type ?? "for_sale"}
                >
                  <option value="for_sale">For sale</option>
                  <option value="for_rent">For rent</option>
                  <option value="mixed_use">Mixed use</option>
                </Select>
              </Field>
              <Field
                label="Price period"
                htmlFor="price_period"
                hint="Use “Monthly” for rentals; price from/to are read as monthly rent."
              >
                <Select
                  id="price_period"
                  name="price_period"
                  defaultValue={project.price_period ?? "total"}
                >
                  <option value="total">Total (sale)</option>
                  <option value="monthly">Monthly (rent)</option>
                </Select>
              </Field>
              <Field label="Price from (public)" htmlFor="price_from_public">
                <Input
                  id="price_from_public"
                  name="price_from_public"
                  type="number"
                  defaultValue={project.price_from_public ?? ""}
                />
              </Field>
              <Field label="Price to (public)" htmlFor="price_to_public">
                <Input
                  id="price_to_public"
                  name="price_to_public"
                  type="number"
                  defaultValue={project.price_to_public ?? ""}
                />
              </Field>
            </div>
            <Field label="Hero image URL" htmlFor="hero_image_url">
              <Input
                id="hero_image_url"
                name="hero_image_url"
                defaultValue={project.hero_image_url ?? ""}
              />
            </Field>
            <Field label="Short description" htmlFor="description_short">
              <Textarea
                id="description_short"
                name="description_short"
                defaultValue={project.description_short ?? ""}
              />
            </Field>
            <Field label="Long description" htmlFor="description_long">
              <Textarea
                id="description_long"
                name="description_long"
                defaultValue={project.description_long ?? ""}
              />
            </Field>
            <Field
              label="Record status"
              htmlFor="record_status"
              hint="Public visibility also requires the page to be published."
            >
              <Select
                id="record_status"
                name="record_status"
                defaultValue={recordStatus}
              >
                {RECORD_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {RECORD_STATUS[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={Boolean(project.is_featured)}
                className="mt-0.5 size-4"
              />
              <span>
                Feature on the public marketplace — shows in the “Featured
                developments” strip and floats to the top of the results grid.
              </span>
            </label>
            <Button type="submit">Save project</Button>
          </form>
        </CardBody>
      </Card>

      {/* Broker-only commission & negotiability */}
      <Card id="commission" className="scroll-mt-14">
        <CardBody>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">Commission &amp; negotiability</h3>
            <Badge tone="warning">Broker-only</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Private commercial terms. Visible to approved brokers; never shown on
            the public page.
          </p>
          <form action={saveCommercials} className="mt-4 space-y-4">
            <input type="hidden" name="project_id" value={id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Commission summary" htmlFor="commission_summary">
                <Input
                  id="commission_summary"
                  name="commission_summary"
                  defaultValue={commercials?.commission_summary ?? ""}
                />
              </Field>
              <Field label="Commission %" htmlFor="commission_percent">
                <Input
                  id="commission_percent"
                  name="commission_percent"
                  type="number"
                  step="0.01"
                  defaultValue={commercials?.commission_percent ?? ""}
                />
              </Field>
              <Field label="Commission negotiable" htmlFor="commission_is_negotiable">
                <Select
                  id="commission_is_negotiable"
                  name="commission_is_negotiable"
                  defaultValue={tri(commercials?.commission_is_negotiable)}
                >
                  <option value="">Unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
              <Field label="Price negotiable" htmlFor="price_is_negotiable">
                <Select
                  id="price_is_negotiable"
                  name="price_is_negotiable"
                  defaultValue={tri(commercials?.price_is_negotiable)}
                >
                  <option value="">Unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
              <Field
                label="Incentives negotiable"
                htmlFor="incentives_are_negotiable"
              >
                <Select
                  id="incentives_are_negotiable"
                  name="incentives_are_negotiable"
                  defaultValue={tri(commercials?.incentives_are_negotiable)}
                >
                  <option value="">Unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
            </div>
            <Field
              label="Commission notes"
              htmlFor="negotiability_notes"
              hint="Shown to brokers in the Commission & negotiability panel."
            >
              <Textarea
                id="negotiability_notes"
                name="negotiability_notes"
                defaultValue={commercials?.negotiability_notes ?? ""}
              />
            </Field>
            <Field
              label="Private incentive notes"
              htmlFor="private_incentive_notes"
              hint="Short-term / broker-only incentive details."
            >
              <Textarea
                id="private_incentive_notes"
                name="private_incentive_notes"
                defaultValue={commercials?.private_incentive_notes ?? ""}
              />
            </Field>
            <Button type="submit">Save commission details</Button>
          </form>
        </CardBody>
      </Card>

      {/* Rental referral terms (PBR) */}
      <Card id="rental" className="scroll-mt-14">
        <CardBody>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">Rental referral terms (PBR)</h3>
            <Badge tone="brand">Rental</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            For purpose-built-rental projects. When enabled and the project is
            published with listing type “for rent”, it appears in the broker-only
            referral feed.
          </p>
          <form action={saveRentalReferralTerms} className="mt-4 space-y-4">
            <input type="hidden" name="project_id" value={id} />
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  name="accepts_referrals"
                  defaultChecked={referral?.accepts_referrals ?? false}
                  className="size-4"
                />
                Accepts referrals
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={referral?.is_active ?? true}
                  className="size-4"
                />
                Active
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Service mode"
                htmlFor="service_mode"
                hint="Who works the referral inbox."
              >
                <Select
                  id="service_mode"
                  name="service_mode"
                  defaultValue={referral?.service_mode ?? "self_serve"}
                >
                  <option value="self_serve">Self-serve (operator)</option>
                  <option value="full_service">Full-service (LIQWD)</option>
                </Select>
              </Field>
              <Field label="Fee type" htmlFor="referral_fee_type">
                <Select
                  id="referral_fee_type"
                  name="referral_fee_type"
                  defaultValue={referral?.referral_fee_type ?? ""}
                >
                  <option value="">—</option>
                  <option value="months_rent">Months of rent</option>
                  <option value="percent_first_year">% of first year</option>
                  <option value="flat">Flat fee</option>
                </Select>
              </Field>
              <Field
                label="Fee value"
                htmlFor="referral_fee_value"
                hint="e.g. 1 (month), 50 (%), 750 (flat $)."
              >
                <Input
                  id="referral_fee_value"
                  name="referral_fee_value"
                  type="number"
                  step="0.01"
                  defaultValue={referral?.referral_fee_value ?? ""}
                />
              </Field>
              <Field label="Min lease (months)" htmlFor="min_lease_term_months">
                <Input
                  id="min_lease_term_months"
                  name="min_lease_term_months"
                  type="number"
                  defaultValue={referral?.min_lease_term_months ?? ""}
                />
              </Field>
              <Field label="Min household income" htmlFor="min_household_income">
                <Input
                  id="min_household_income"
                  name="min_household_income"
                  type="number"
                  defaultValue={referral?.min_household_income ?? ""}
                />
              </Field>
              <Field label="Min credit band" htmlFor="min_credit_band">
                <Select
                  id="min_credit_band"
                  name="min_credit_band"
                  defaultValue={referral?.min_credit_band ?? ""}
                >
                  <option value="">—</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </Field>
              <Field label="Pets allowed" htmlFor="pets_allowed">
                <Select
                  id="pets_allowed"
                  name="pets_allowed"
                  defaultValue={tri(referral?.pets_allowed)}
                >
                  <option value="">Unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
              <Field label="Earliest move-in" htmlFor="earliest_move_in">
                <Input
                  id="earliest_move_in"
                  name="earliest_move_in"
                  type="date"
                  defaultValue={referral?.earliest_move_in ?? ""}
                />
              </Field>
              <Field label="Latest move-in" htmlFor="latest_move_in">
                <Input
                  id="latest_move_in"
                  name="latest_move_in"
                  type="date"
                  defaultValue={referral?.latest_move_in ?? ""}
                />
              </Field>
            </div>
            <Field label="Fee notes (broker-visible)" htmlFor="referral_fee_notes">
              <Textarea
                id="referral_fee_notes"
                name="referral_fee_notes"
                defaultValue={referral?.referral_fee_notes ?? ""}
              />
            </Field>
            <Field
              label="Payout terms"
              htmlFor="payout_terms"
              hint="e.g. invoiced 30 days after lease commencement, brokerage-to-brokerage."
            >
              <Textarea
                id="payout_terms"
                name="payout_terms"
                defaultValue={referral?.payout_terms ?? ""}
              />
            </Field>
            <Button type="submit">Save referral terms</Button>
          </form>
        </CardBody>
      </Card>

      {/* Broker portals */}
      <Card id="portals" className="scroll-mt-14">
        <CardBody>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">Broker portals</h3>
            <Badge tone="warning">Broker-only</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Direct links to the builder&rsquo;s portal, price list, or worksheets.
            Active links appear in the broker Broker Portals directory once the
            project is published. Feature one for paid placement.
          </p>

          {pendingPortals.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Realtor suggestions to review ({pendingPortals.length})
              </p>
              <ul className="mt-2 divide-y divide-amber-100">
                {pendingPortals.map((p) => {
                  const who =
                    [p.submitter?.first_name, p.submitter?.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    p.submitter?.email ||
                    "a realtor";
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {p.portal_name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {p.url ? `${p.url} · ` : ""}suggested by {who}
                        </p>
                        {p.access_notes ? (
                          <p className="truncate text-xs text-slate-400">
                            {p.access_notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <form action={approveBrokerPortal}>
                          <input type="hidden" name="portal_id" value={p.id} />
                          <input type="hidden" name="project_id" value={id} />
                          <Button type="submit" size="sm">
                            Approve
                          </Button>
                        </form>
                        <form action={rejectBrokerPortal}>
                          <input type="hidden" name="portal_id" value={p.id} />
                          <input type="hidden" name="project_id" value={id} />
                          <Button type="submit" size="sm" variant="danger">
                            Reject
                          </Button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {livePortals.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {livePortals.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <span className="truncate">{p.portal_name}</span>
                      {p.is_primary ? <Badge tone="brand">Primary</Badge> : null}
                      {p.is_featured ? (
                        <Badge tone="featured">Featured</Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {p.url ? `${p.url} · ` : ""}
                      {clickCounts.get(p.id) ?? 0} clicks
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={setBrokerPortalFeatured}>
                      <input type="hidden" name="portal_id" value={p.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <input
                        type="hidden"
                        name="is_featured"
                        value={p.is_featured ? "false" : "true"}
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        {p.is_featured ? "Unfeature" : "Feature"}
                      </Button>
                    </form>
                    <form action={removeBrokerPortal}>
                      <input type="hidden" name="portal_id" value={p.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <Button type="submit" size="sm" variant="danger">
                        Remove
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No broker portals yet.</p>
          )}

          <form
            action={addBrokerPortal}
            className="mt-4 space-y-4 border-t border-slate-100 pt-4"
          >
            <input type="hidden" name="project_id" value={id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Portal name" htmlFor="portal_name">
                <Input
                  id="portal_name"
                  name="portal_name"
                  placeholder="e.g. Builder broker portal"
                  required
                />
              </Field>
              <Field label="Type" htmlFor="portal_type">
                <Select
                  id="portal_type"
                  name="portal_type"
                  defaultValue="external_url"
                >
                  <option value="external_url">Website</option>
                  <option value="login_page">Login page</option>
                  <option value="drive_folder">Drive folder</option>
                  <option value="pdf">PDF</option>
                  <option value="internal_file">File</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </div>
            <Field label="URL" htmlFor="url">
              <Input id="url" name="url" type="url" placeholder="https://…" />
            </Field>
            <Field
              label="Access notes"
              htmlFor="access_notes"
              hint="Login hint or how to request access (optional)."
            >
              <Input id="access_notes" name="access_notes" />
            </Field>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="is_primary" className="size-4" />{" "}
                Primary
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="is_featured" className="size-4" />{" "}
                Featured (paid placement)
              </label>
            </div>
            <Button type="submit" variant="secondary">
              Add portal
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Public, SEO-safe page fields */}
      <Card id="public-content" className="scroll-mt-14">
        <CardBody>
          <h3 className="font-semibold text-ink">Public page content</h3>
          <p className="mt-1 text-sm text-slate-500">
            Only public-safe fields. Never includes commission, broker portals,
            or private data.
          </p>
          <form action={savePublicPage} className="mt-4 space-y-4">
            <input type="hidden" name="project_id" value={id} />
            <Field
              label="Assigned agent"
              htmlFor="assigned_realtor_profile_id"
              hint="Realtor shown as the contact card on the public page. Lists all agents; only approved + public-profile-enabled agents render publicly."
            >
              <AgentSelect
                agents={agentOptions}
                defaultValue={page?.assigned_realtor_profile_id ?? ""}
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="slug"
              hint="Used in the public URL: /projects/your-slug"
            >
              <Input
                id="slug"
                name="slug"
                defaultValue={page?.slug ?? project.slug ?? ""}
                required
              />
            </Field>
            <SeoFields
              projectId={id}
              defaults={{
                seo_title: page?.seo_title ?? "",
                seo_meta_description: page?.seo_meta_description ?? "",
                page_summary: page?.page_summary ?? "",
                page_description: page?.page_description ?? "",
                section_intro: page?.section_intro ?? "",
                section_amenities: page?.section_amenities ?? "",
                section_getting_around: page?.section_getting_around ?? "",
                section_developer: page?.section_developer ?? "",
              }}
            />
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                name="indexable"
                defaultChecked={page?.indexable ?? false}
                className="size-4"
              />
              Allow search engines to index this page
            </label>
            <Button type="submit" variant="secondary">
              Save public content
            </Button>
          </form>
        </CardBody>
      </Card>

      <div id="uploads" className="scroll-mt-14">
      <ProjectUploads
        projectId={id}
        heroUrl={project.hero_image_url ?? null}
        media={(media ?? []) as { id: string; url: string; alt_text: string | null }[]}
        floorplans={
          (floorplans ?? []) as {
            id: string;
            plan_name: string | null;
            unit_type: string | null;
            sqft_interior: number | null;
            price_public: number | null;
            floorplan_image_url: string | null;
          }[]
        }
        documents={(documents ?? []).map((d) => ({
          id: d.id as string,
          title: d.title as string,
          document_type: d.document_type as string,
          signedUrl: signedByPath.get(d.file_url as string) ?? null,
          path: d.file_url as string,
        }))}
      />
      </div>
    </div>
  );
}
