import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import {
  MICROSITE_SECTIONS,
  MICROSITE_SUBPAGES,
  resolveSectionKeys,
  type MicrositeConfig,
  type MicrositeContent,
} from "@/lib/microsites";
import type { PublicProject } from "@/lib/types";
import {
  vercelDomainsConfigured,
  checkDomain,
  domainAttached,
} from "@/lib/vercel-domains";
import {
  saveMicrositeContext,
  generateMicrosite,
  setMicrositeStatus,
  buyMicrositeDomain,
  attachMicrositeDomain,
  saveMicrositeLeadAutomation,
  saveGoogleVerification,
} from "../actions";
import { MicrositeContentEditor } from "./content-editor";
import { BuilderLogoUploader } from "./logo-uploader";
import { MicrositeImagesManager } from "./images-manager";

export const metadata: Metadata = { title: "Microsite" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  domain: string;
  project_id: string;
  status: string;
  context: Record<string, unknown>;
  content: MicrositeContent | null;
  updated_at: string;
  auto_send_details: boolean;
  details_url: string | null;
  builder_logo_url: string | null;
  google_verification: string | null;
}

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

const CONTEXT_PLACEHOLDER = `Answer any of the staple questions (free text is fine — docs/microsite-context-questionnaire.md):
• Builder website or sales page link, or paste their about copy — ALWAYS include this; any URL here gets fetched and woven into the developer profile
• Who's the buyer? (young professionals / families / investors / downsizers…)
• The one-line hook — why this project matters
• Lead with… / avoid…
• Local knowledge nuggets ("backs onto the ravine, rec centre opening 2027")
• Deposit structure / incentives we may publish, launch timeline, exclusives

Tip: {"hero_style": "colour"} (JSON) swaps the hero photo for a branded
gradient — use it when the project's hero image is a placeholder graphic.`;

export default async function AdminMicrositeDetail({
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
    .from("microsite_configs")
    .select(
      "id, domain, project_id, status, context, content, updated_at, auto_send_details, details_url, builder_logo_url, google_verification",
    )
    .eq("id", id)
    .maybeSingle();
  const site = (data as Row | null) ?? null;
  if (!site) notFound();

  const { data: projData } = await supabase
    .from("public_projects_view")
    .select("project_name, slug, city, builder_name, hero_image_url")
    .eq("project_id", site.project_id)
    .maybeSingle();
  const project = projData as {
    project_name: string;
    slug: string;
    city: string | null;
    builder_name: string | null;
    hero_image_url: string | null;
  } | null;

  const { data: mediaData } = await supabase
    .from("project_media")
    .select("id, url, alt_text")
    .eq("project_id", site.project_id)
    .eq("is_public", true)
    .neq("media_type", "floorplan")
    .order("sort_order", { ascending: true });
  const media =
    (mediaData as { id: string; url: string; alt_text: string | null }[] | null) ??
    [];

  const contextText =
    typeof site.context?.notes === "string"
      ? (site.context.notes as string)
      : Object.keys(site.context ?? {}).length
        ? JSON.stringify(site.context, null, 2)
        : "";
  const c = site.content;
  const defaultSeoTitle = `${project?.project_name ?? "Project"}${project?.city ? ` in ${project.city}` : ""} | Homes, Prices & Floor Plans`;
  const checkedSections = resolveSectionKeys(
    { context: site.context ?? {} } as MicrositeConfig,
    {
      city: project?.city ?? null,
      builder_name: project?.builder_name ?? null,
    } as PublicProject,
  );

  // Domain automation (only when Vercel env is configured): is the domain on
  // the project yet, and if not, can we buy it right here?
  const vercelOn = vercelDomainsConfigured();
  const attached = vercelOn ? await domainAttached(site.domain) : null;
  const check = vercelOn && attached === false ? await checkDomain(site.domain) : null;

  // Launch checklist — what still needs attention before (and after) going
  // live. ok: true = done, false = fix it, null = can't verify from here.
  const subpageCount = c?.pages ? Object.keys(c.pages).length : 0;
  const checklist: { ok: boolean | null; label: string; hint: string }[] = [
    {
      ok: /https?:\/\//.test(JSON.stringify(site.context ?? {})),
      label: "Builder link in context",
      hint: "Paste the builder's site URL below; it feeds the developer profile.",
    },
    {
      ok: Boolean(project?.hero_image_url),
      label: "Hero photo",
      hint: "Upload a rendering in Images and hit Make hero.",
    },
    {
      ok: media.length >= 5 ? true : media.length > 0 ? null : false,
      label: `Photos (${media.length})`,
      hint: "Aim for 5 or more so sections use real renderings, not stock.",
    },
    {
      ok: Boolean(site.builder_logo_url),
      label: "Developer logo",
      hint: "Upload it or paste a URL in the logo card.",
    },
    {
      ok: Boolean(c),
      label: "Content generated",
      hint: "Hit Generate (add context first for better copy).",
    },
    {
      ok: c ? subpageCount >= 4 : false,
      label: `Sub-pages (${subpageCount}/4)`,
      hint: "Regenerate to create /floor-plans, /site-plan, /pricing, /neighbourhood.",
    },
    {
      ok: c ? Boolean(c.brand) : false,
      label: "Brand extracted",
      hint: "Regenerate after setting a real hero, or set colours/font in the editor.",
    },
    {
      ok: vercelOn ? attached === true : null,
      label: "Domain attached to Vercel",
      hint: vercelOn
        ? "Use the Domain card below."
        : "Can't verify from here; check the Vercel dashboard (or set VERCEL_TOKEN).",
    },
    {
      ok: site.status === "live",
      label: "Live",
      hint: "Set live once the items above are green.",
    },
    {
      ok: site.google_verification ? null : false,
      label: "Search Console",
      hint: site.google_verification
        ? "Token stored. Verify in GSC, then submit the sitemap."
        : "Add the verification token below (or use a DNS TXT record in Vercel).",
    },
  ];
  const openItems = checklist.filter((i) => i.ok !== true).length;

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/admin/microsites"
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            ← All microsites
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {site.domain}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {project ? (
              <>
                Grounds in{" "}
                <Link
                  href={`/projects/${project.slug}`}
                  target="_blank"
                  className="text-brand-700 hover:underline"
                >
                  {project.project_name}
                </Link>
                {project.city ? ` · ${project.city}` : ""}
              </>
            ) : (
              "Project not publicly visible"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {site.status === "live" ? (
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-700 hover:underline"
            >
              Visit ↗
            </a>
          ) : null}
          <Badge
            tone={
              site.status === "live"
                ? "success"
                : site.status === "draft"
                  ? "brand"
                  : "neutral"
            }
          >
            {site.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-ink">Status</h3>
            <Badge tone={openItems === 0 ? "success" : "warning"}>
              {openItems === 0 ? "Ready" : `${openItems} to do`}
            </Badge>
          </div>
          <ul className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden
                  className={
                    item.ok === true
                      ? "mt-0.5 text-emerald-600"
                      : item.ok === null
                        ? "mt-0.5 text-slate-400"
                        : "mt-0.5 text-amber-500"
                  }
                >
                  {item.ok === true ? "✓" : item.ok === null ? "•" : "!"}
                </span>
                <span>
                  <span
                    className={
                      item.ok === true ? "text-slate-500" : "font-medium text-slate-800"
                    }
                  >
                    {item.label}
                  </span>
                  {item.ok !== true ? (
                    <span className="block text-xs text-slate-400">{item.hint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium text-slate-600">Workflow:</span>
          <form action={generateMicrosite}>
            <input type="hidden" name="microsite_id" value={site.id} />
            <Button type="submit" size="sm" variant="secondary">
              {c ? "Regenerate content" : "Generate content"}
            </Button>
          </form>
          <form action={setMicrositeStatus}>
            <input type="hidden" name="microsite_id" value={site.id} />
            <input type="hidden" name="status" value="live" />
            <Button type="submit" size="sm" disabled={site.status === "live"}>
              Set live
            </Button>
          </form>
          <form action={setMicrositeStatus}>
            <input type="hidden" name="microsite_id" value={site.id} />
            <input type="hidden" name="status" value="draft" />
            <Button type="submit" size="sm" variant="secondary" disabled={site.status === "draft"}>
              Back to draft
            </Button>
          </form>
          <form action={setMicrositeStatus}>
            <input type="hidden" name="microsite_id" value={site.id} />
            <input type="hidden" name="status" value="retired" />
            <Button type="submit" size="sm" variant="ghost" disabled={site.status === "retired"}>
              Retire
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Preview</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {c ? (
                <>
                  The real page, exactly as visitors get it. Generated{" "}
                  {new Date(c.generated_at).toLocaleString("en-CA")}
                  {c.edited_at
                    ? `, hand-edited ${new Date(c.edited_at).toLocaleString("en-CA")}`
                    : ""}
                  {" · sub-pages: "}
                  {MICROSITE_SUBPAGES.filter((p) => c.pages?.[p.key])
                    .map((p) => `/${p.slug}`)
                    .join(", ") || "none yet (regenerate to create them)"}
                  {c.brand
                    ? ` · brand: ${c.brand.heading_font}, ${c.brand.primary}`
                    : " · brand: defaults (no rendering to extract from)"}
                </>
              ) : (
                "Generate content first, then preview the real page here."
              )}
            </p>
          </div>
          {c ? (
            <a
              href={`/microsite-preview/${site.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Open full preview ↗
            </a>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Lead automation</h3>
          <p className="mt-1 text-sm text-slate-500">
            Every microsite lead is assigned to the admin account (current
            policy) and lands in the Leads queue, source-tagged with this
            domain. Optionally auto-email each new lead the project details.
          </p>
          <form
            action={saveMicrositeLeadAutomation}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="microsite_id" value={site.id} />
            <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-slate-700">
              <Checkbox
                name="auto_send_details"
                defaultChecked={site.auto_send_details}
              />
              Auto-send details to new leads
            </label>
            <div className="min-w-72 flex-1">
              <Field
                label="Details link"
                htmlFor="ms_details_url"
                hint="A Google Drive package or any https link. Blank = the LIQWD listing."
              >
                <Input
                  id="ms_details_url"
                  name="details_url"
                  defaultValue={site.details_url ?? ""}
                  placeholder="https://drive.google.com/…"
                  maxLength={2000}
                />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Developer logo</h3>
          <p className="mt-1 text-sm text-slate-500">
            Shown in the &quot;About the developer&quot; section. Upload it or
            paste a URL (the builder&apos;s site almost always has one).
          </p>
          <div className="mt-3">
            <BuilderLogoUploader
              micrositeId={site.id}
              projectId={site.project_id}
              currentUrl={site.builder_logo_url}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Google Search Console</h3>
          <p className="mt-1 text-sm text-slate-500">
            Fastest route: in Vercel &rarr; Domains &rarr;{" "}
            <span className="font-medium">Manage DNS records</span>, add
            GSC&apos;s TXT record for a Domain property (no field needed
            here). Otherwise pick <span className="font-medium">URL prefix</span>{" "}
            in GSC and paste its token or <code>googleXXX.html</code> filename
            below, then hit Verify.
          </p>
          <form
            action={saveGoogleVerification}
            className="mt-3 flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="microsite_id" value={site.id} />
            <div className="min-w-72 flex-1">
              <Field
                label="Verification token, meta tag, or filename"
                htmlFor="ms_gsc"
                hint="Blank clears it. The meta tag renders even before the site is live."
              >
                <Input
                  id="ms_gsc"
                  name="google_verification"
                  defaultValue={site.google_verification ?? ""}
                  placeholder="AbC123… or google1a2b3c.html"
                  maxLength={200}
                />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Images</h3>
          <p className="mt-1 text-sm text-slate-500">
            The photography this microsite pulls from (shared with the
            project&apos;s media library). Upload renderings, make any of
            them the hero, remove the weak ones.
          </p>
          <div className="mt-3">
            <MicrositeImagesManager
              micrositeId={site.id}
              projectId={site.project_id}
              heroUrl={project?.hero_image_url ?? null}
              media={media}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Domain</h3>
          {!vercelOn ? (
            <p className="mt-1 text-sm text-slate-500">
              Manual mode: buy the domain anywhere, then attach it to the LIQWD
              project in the Vercel dashboard (Settings → Domains). To buy and
              attach from this screen instead, set{" "}
              <code className="rounded bg-slate-100 px-1">VERCEL_TOKEN</code> and{" "}
              <code className="rounded bg-slate-100 px-1">VERCEL_PROJECT_ID</code>{" "}
              in Vercel env.
            </p>
          ) : attached ? (
            <p className="mt-1 text-sm text-emerald-700">
              {site.domain} is attached to the Vercel project — DNS is handled.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {check?.available && check.price != null ? (
                <>
                  <p className="text-sm text-slate-600">
                    Available to register for{" "}
                    <span className="font-semibold text-ink">
                      US${check.price}/yr
                    </span>{" "}
                    on the Vercel account.
                  </p>
                  <form action={buyMicrositeDomain}>
                    <input type="hidden" name="microsite_id" value={site.id} />
                    <Button type="submit" size="sm">
                      Buy &amp; attach
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    Not attached to the Vercel project yet
                    {check && !check.available
                      ? " (already registered — if you own it, attach it)"
                      : ""}
                    .
                  </p>
                  <form action={attachMicrositeDomain}>
                    <input type="hidden" name="microsite_id" value={site.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      Attach to Vercel project
                    </Button>
                  </form>
                </>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Positioning context</h3>
          <p className="mt-1 text-sm text-slate-500">
            The questionnaire answers that steer generation — free text or
            JSON. Save, then regenerate to apply.
          </p>
          <form action={saveMicrositeContext} className="mt-3 space-y-3">
            <input type="hidden" name="microsite_id" value={site.id} />
            <Field label="Context" htmlFor="ms_context">
              <Textarea
                id="ms_context"
                name="context"
                className="min-h-40 font-mono text-xs"
                defaultValue={contextText}
                placeholder={CONTEXT_PLACEHOLDER}
                maxLength={8000}
              />
            </Field>
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">
                Sections to generate
              </legend>
              <p className="mt-0.5 text-xs text-slate-400">
                Each section has its own writing prompt. Leave your picks and
                regenerate; none checked = auto based on the project facts.
              </p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                {MICROSITE_SECTIONS.map((s) => (
                  <label
                    key={s.key}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <Checkbox
                      name="sections"
                      value={s.key}
                      defaultChecked={checkedSections.includes(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="submit" variant="secondary">
              Save context
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Page content — every field is editable</h3>
          <p className="mt-1 text-sm text-slate-500">
            {c
              ? "Rewrite anything the generator produced, then save. Regenerating replaces the body copy but keeps your SEO overrides."
              : "Generate first (recommended), or write the page by hand from scratch."}
          </p>
          <div className="mt-4">
            <MicrositeContentEditor
              micrositeId={site.id}
              initial={c}
              defaultSeoTitle={defaultSeoTitle}
            />
          </div>
        </CardBody>
      </Card>

    </div>
  );
}
