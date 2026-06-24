import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { saveSeoPromptSettings } from "./actions";
import { BackfillSectionsButton } from "./backfill-button";
import { SourceHeroesButton } from "./source-heroes-button";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

interface Settings {
  overall_instructions: string | null;
  seo_title_instructions: string | null;
  seo_meta_description_instructions: string | null;
  page_summary_instructions: string | null;
  page_description_instructions: string | null;
  updated_at: string | null;
}

export default async function AdminSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_prompt_settings")
    .select(
      "overall_instructions, seo_title_instructions, seo_meta_description_instructions, page_summary_instructions, page_description_instructions, updated_at",
    )
    .eq("id", 1)
    .maybeSingle();
  const s = (data ?? null) as Settings | null;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">AI SEO prompt instructions</h3>
          <p className="mt-1 text-sm text-slate-500">
            Steer how Claude writes each public-page field. These apply to every
            future generation — the manual “Generate with AI” button and the
            automatic generation on publish — and stay in effect until you
            change them. Leave a box blank to use the default.
          </p>

          {saved ? (
            <Notice tone="success">Saved. New instructions are now in effect.</Notice>
          ) : null}

          <form action={saveSeoPromptSettings} className="mt-4 space-y-4">
            <Field
              label="Overall house style (applies to all fields)"
              htmlFor="overall_instructions"
              hint="Brand voice, tone, must-avoid words, target audience, etc."
            >
              <Textarea
                id="overall_instructions"
                name="overall_instructions"
                defaultValue={s?.overall_instructions ?? ""}
              />
            </Field>
            <Field label="SEO title instruction" htmlFor="seo_title_instructions">
              <Textarea
                id="seo_title_instructions"
                name="seo_title_instructions"
                defaultValue={s?.seo_title_instructions ?? ""}
              />
            </Field>
            <Field
              label="Meta description instruction"
              htmlFor="seo_meta_description_instructions"
            >
              <Textarea
                id="seo_meta_description_instructions"
                name="seo_meta_description_instructions"
                defaultValue={s?.seo_meta_description_instructions ?? ""}
              />
            </Field>
            <Field
              label="Page summary instruction"
              htmlFor="page_summary_instructions"
            >
              <Textarea
                id="page_summary_instructions"
                name="page_summary_instructions"
                defaultValue={s?.page_summary_instructions ?? ""}
              />
            </Field>
            <Field
              label="Public description instruction"
              htmlFor="page_description_instructions"
            >
              <Textarea
                id="page_description_instructions"
                name="page_description_instructions"
                defaultValue={s?.page_description_instructions ?? ""}
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button type="submit">Save instructions</Button>
              {s?.updated_at ? (
                <span className="text-xs text-slate-400">
                  Last updated{" "}
                  {new Date(s.updated_at).toLocaleString("en-CA")}
                </span>
              ) : null}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Backfill content sections</h3>
          <p className="mt-1 text-sm text-slate-500">
            Generate the four page sections — intro, local amenities, getting
            around, and the developer — for published projects that don&apos;t
            have them yet. Runs 8 projects per click; keep clicking until it
            reports 0 remaining. Existing copy is never overwritten.
          </p>
          <div className="mt-4">
            <BackfillSectionsButton />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Auto-source &amp; publish heroes</h3>
          <p className="mt-1 text-sm text-slate-500">
            Finds draft projects without a real hero image, sources a candidate
            rendering, AI-verifies it&apos;s an actual building rendering (not a
            floor plan, map, or logo), then publishes it with auto-generated
            sections. Runs 3 per click; the same job runs automatically every
            week. Nothing publishes unless the image passes the vision check.
          </p>
          <div className="mt-4">
            <SourceHeroesButton />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
