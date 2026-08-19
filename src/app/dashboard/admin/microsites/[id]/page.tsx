import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Textarea } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { renderMarkdown } from "@/lib/markdown";
import type { MicrositeContent } from "@/lib/microsites";
import {
  saveMicrositeContext,
  generateMicrosite,
  setMicrositeStatus,
} from "../actions";

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
}

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

const CONTEXT_PLACEHOLDER = `Answer any of the staple questions (free text is fine — docs/microsite-context-questionnaire.md):
• Who's the buyer? (young professionals / families / investors / downsizers…)
• The one-line hook — why this project matters
• Lead with… / avoid…
• Local knowledge nuggets ("backs onto the ravine, rec centre opening 2027")
• Deposit structure / incentives we may publish, launch timeline, exclusives`;

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
    .select("id, domain, project_id, status, context, content, updated_at")
    .eq("id", id)
    .maybeSingle();
  const site = (data as Row | null) ?? null;
  if (!site) notFound();

  const { data: projData } = await supabase
    .from("public_projects_view")
    .select("project_name, slug, city")
    .eq("project_id", site.project_id)
    .maybeSingle();
  const project = projData as { project_name: string; slug: string; city: string | null } | null;

  const contextText =
    typeof site.context?.notes === "string"
      ? (site.context.notes as string)
      : Object.keys(site.context ?? {}).length
        ? JSON.stringify(site.context, null, 2)
        : "";
  const c = site.content;

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
            <Button type="submit" variant="secondary">
              Save context
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Generated page (review before going live)</h3>
          {!c ? (
            <p className="mt-2 text-sm text-slate-500">
              No content yet — add context above (optional) and hit Generate.
            </p>
          ) : (
            <div className="mt-3 space-y-5">
              <div className="rounded-xl bg-ink p-6 text-white">
                <p className="text-2xl font-semibold tracking-tight">{c.headline}</p>
                <p className="mt-2 text-white/80">{c.subhead}</p>
                <p className="mt-3 inline-block rounded-full bg-brand-500 px-4 py-1.5 text-sm font-semibold">
                  {c.cta_label}
                </p>
              </div>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(c.intro_md) }} />
              {c.sections.map((s) => (
                <section key={s.title}>
                  <h4 className="text-lg font-semibold text-ink">{s.title}</h4>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body_md) }} />
                </section>
              ))}
              {c.faq.length > 0 ? (
                <section>
                  <h4 className="text-lg font-semibold text-ink">FAQ</h4>
                  <ul className="mt-2 space-y-2">
                    {c.faq.map((f) => (
                      <li key={f.question} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="font-medium text-slate-800">{f.question}</p>
                        <p className="mt-1 text-slate-600">{f.answer}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <p className="text-xs text-slate-400">
                Generated {new Date(c.generated_at).toLocaleString("en-CA")}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
