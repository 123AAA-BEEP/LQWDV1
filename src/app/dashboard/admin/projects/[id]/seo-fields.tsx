"use client";

import { useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { generateSeo } from "./seo-actions";
import type { SeoFieldsValue } from "@/lib/seo";

/**
 * The four public-page SEO fields plus a "Generate with AI" button. Controlled
 * so the AI result can populate them; the admin edits and then saves with the
 * surrounding form (fields keep their `name` attributes).
 */
export function SeoFields({
  projectId,
  defaults,
}: {
  projectId: string;
  defaults: SeoFieldsValue;
}) {
  const [v, setV] = useState<SeoFieldsValue>(defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await generateSeo(projectId);
    if ("error" in res) setError(res.error);
    else setV(res);
    setBusy(false);
  }

  const set = (k: keyof SeoFieldsValue) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setV((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={generate}
          disabled={busy}
        >
          {busy ? "Generating…" : "✨ Generate with AI"}
        </Button>
        <span className="text-xs text-slate-500">
          Fills the fields below from the project data. Review before saving.
        </span>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Field label="SEO title" htmlFor="seo_title">
        <Input
          id="seo_title"
          name="seo_title"
          value={v.seo_title}
          onChange={set("seo_title")}
        />
      </Field>
      <Field label="Meta description" htmlFor="seo_meta_description">
        <Textarea
          id="seo_meta_description"
          name="seo_meta_description"
          value={v.seo_meta_description}
          onChange={set("seo_meta_description")}
        />
      </Field>
      <Field label="Page summary" htmlFor="page_summary">
        <Textarea
          id="page_summary"
          name="page_summary"
          value={v.page_summary}
          onChange={set("page_summary")}
        />
      </Field>
      <Field
        label="Public description"
        htmlFor="page_description"
        hint="Approved, public-safe copy shown on the public page."
      >
        <Textarea
          id="page_description"
          name="page_description"
          value={v.page_description}
          onChange={set("page_description")}
        />
      </Field>

      <Field
        label="Section: Intro"
        htmlFor="section_intro"
        hint="What the project is and where it's headed. Blank line = new paragraph."
      >
        <Textarea
          id="section_intro"
          name="section_intro"
          rows={4}
          value={v.section_intro}
          onChange={set("section_intro")}
        />
      </Field>
      <Field
        label="Section: Local amenities"
        htmlFor="section_amenities"
        hint="Shopping, dining, parks, schools, recreation."
      >
        <Textarea
          id="section_amenities"
          name="section_amenities"
          rows={4}
          value={v.section_amenities}
          onChange={set("section_amenities")}
        />
      </Field>
      <Field
        label="Section: Getting around"
        htmlFor="section_getting_around"
        hint="Highways and transit serving the area."
      >
        <Textarea
          id="section_getting_around"
          name="section_getting_around"
          rows={4}
          value={v.section_getting_around}
          onChange={set("section_getting_around")}
        />
      </Field>
      <Field
        label="Section: About the developer"
        htmlFor="section_developer"
        hint="The builder's focus and reputation."
      >
        <Textarea
          id="section_developer"
          name="section_developer"
          rows={4}
          value={v.section_developer}
          onChange={set("section_developer")}
        />
      </Field>
    </div>
  );
}
