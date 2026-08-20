"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { MicrositeContent } from "@/lib/microsites";
import { BRAND_FONTS, SERIF_FONTS, type MicrositeBrand } from "@/lib/microsite-brand";
import { saveMicrositeContent } from "../actions";

/**
 * Full manual control over the generated page — every field the renderer
 * reads is editable here. Saving never touches status; regenerating
 * overwrites body copy but keeps the SEO overrides.
 */

const BLANK: MicrositeContent = {
  headline: "",
  subhead: "",
  intro_md: "",
  sections: [],
  faq: [],
  cta_label: "Get first access",
  generated_at: "",
  seo_title: null,
  seo_description: null,
};

export function MicrositeContentEditor({
  micrositeId,
  initial,
}: {
  micrositeId: string;
  initial: MicrositeContent | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<MicrositeContent>(initial ?? BLANK);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );

  const set = <K extends keyof MicrositeContent>(
    key: K,
    value: MicrositeContent[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const setSection = (i: number, patch: Partial<{ title: string; body_md: string }>) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  const setFaq = (i: number, patch: Partial<{ question: string; answer: string }>) =>
    setDraft((d) => ({
      ...d,
      faq: d.faq.map((f, j) => (j === i ? { ...f, ...patch } : f)),
    }));

  const setBrand = (patch: Partial<MicrositeBrand>) =>
    setDraft((d) => ({
      ...d,
      brand: {
        primary: "#0d9488",
        accent: "#14b8a6",
        heading_font: "Inter",
        font_stack: "sans-serif" as const,
        ...(d.brand ?? {}),
        ...patch,
      },
    }));

  const move = (list: "sections" | "faq", i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const arr = [...d[list]];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, [list]: arr };
    });

  const save = () =>
    startTransition(async () => {
      setNotice(null);
      const res = await saveMicrositeContent({ micrositeId, content: draft });
      if (res?.error) {
        setNotice({ text: res.error, error: true });
      } else {
        setNotice({ text: "Saved — the preview below reflects it.", error: false });
        router.refresh();
      }
    });

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-sm font-medium text-slate-700">
          Brand (extracted from the renderings; override anything)
        </p>
        <div className="mt-2 grid items-end gap-3 sm:grid-cols-4">
          <Field label="Button colour (hex)" htmlFor="ed_brand_primary">
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pick button colour"
                value={draft.brand?.primary ?? "#0d9488"}
                onChange={(e) => setBrand({ primary: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded border border-slate-200"
              />
              <Input
                id="ed_brand_primary"
                value={draft.brand?.primary ?? ""}
                onChange={(e) => setBrand({ primary: e.target.value })}
                placeholder="#0d9488"
                maxLength={7}
              />
            </div>
          </Field>
          <Field label="Accent (hex)" htmlFor="ed_brand_accent">
            <Input
              id="ed_brand_accent"
              value={draft.brand?.accent ?? ""}
              onChange={(e) => setBrand({ accent: e.target.value })}
              placeholder="#14b8a6"
              maxLength={7}
            />
          </Field>
          <Field label="Font" htmlFor="ed_brand_font">
            <Select
              id="ed_brand_font"
              value={draft.brand?.heading_font ?? "Inter"}
              onChange={(e) =>
                setBrand({
                  heading_font: e.target.value,
                  font_stack: SERIF_FONTS.has(e.target.value)
                    ? "serif"
                    : "sans-serif",
                })
              }
            >
              {BRAND_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDraft((d) => ({ ...d, brand: null }))}
          >
            Reset to defaults
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Headline (H1)" htmlFor="ed_headline">
          <Input
            id="ed_headline"
            value={draft.headline}
            onChange={(e) => set("headline", e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Lead-form button label" htmlFor="ed_cta">
          <Input
            id="ed_cta"
            value={draft.cta_label}
            onChange={(e) => set("cta_label", e.target.value)}
            maxLength={80}
          />
        </Field>
      </div>
      <Field label="Subhead (under the H1)" htmlFor="ed_subhead">
        <Textarea
          id="ed_subhead"
          className="min-h-14"
          value={draft.subhead}
          onChange={(e) => set("subhead", e.target.value)}
          maxLength={500}
        />
      </Field>
      <Field label="Intro (markdown)" htmlFor="ed_intro">
        <Textarea
          id="ed_intro"
          className="min-h-32"
          value={draft.intro_md}
          onChange={(e) => set("intro_md", e.target.value)}
          maxLength={8000}
        />
      </Field>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Sections</p>
        {draft.sections.map((s, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label={`Section ${i + 1} title`} htmlFor={`ed_st_${i}`}>
                  <Input
                    id={`ed_st_${i}`}
                    value={s.title}
                    onChange={(e) => setSection(i, { title: e.target.value })}
                    maxLength={160}
                  />
                </Field>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Move section ${i + 1} up`}
                disabled={i === 0}
                onClick={() => move("sections", i, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Move section ${i + 1} down`}
                disabled={i === draft.sections.length - 1}
                onClick={() => move("sections", i, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  set("sections", draft.sections.filter((_, j) => j !== i))
                }
              >
                Remove
              </Button>
            </div>
            <Textarea
              aria-label={`Section ${i + 1} body`}
              className="min-h-24"
              value={s.body_md}
              onChange={(e) => setSection(i, { body_md: e.target.value })}
              maxLength={8000}
            />
          </div>
        ))}
        {draft.sections.length < 14 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              set("sections", [...draft.sections, { title: "", body_md: "" }])
            }
          >
            Add section
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">FAQ</p>
        {draft.faq.map((f, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label={`Question ${i + 1}`} htmlFor={`ed_fq_${i}`}>
                  <Input
                    id={`ed_fq_${i}`}
                    value={f.question}
                    onChange={(e) => setFaq(i, { question: e.target.value })}
                    maxLength={200}
                  />
                </Field>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Move question ${i + 1} up`}
                disabled={i === 0}
                onClick={() => move("faq", i, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Move question ${i + 1} down`}
                disabled={i === draft.faq.length - 1}
                onClick={() => move("faq", i, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => set("faq", draft.faq.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </div>
            <Textarea
              aria-label={`Answer ${i + 1}`}
              className="min-h-16"
              value={f.answer}
              onChange={(e) => setFaq(i, { answer: e.target.value })}
              maxLength={2000}
            />
          </div>
        ))}
        {draft.faq.length < 8 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              set("faq", [...draft.faq, { question: "", answer: "" }])
            }
          >
            Add FAQ
          </Button>
        ) : null}
      </div>

      {notice ? (
        <p
          role="status"
          className={notice.error ? "text-sm text-red-600" : "text-sm text-emerald-700"}
        >
          {notice.text}
        </p>
      ) : null}
      <Button type="button" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save content"}
      </Button>
    </div>
  );
}
