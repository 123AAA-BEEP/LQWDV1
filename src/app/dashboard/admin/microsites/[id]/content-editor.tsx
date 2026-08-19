"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { MicrositeContent } from "@/lib/microsites";
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
  defaultSeoTitle,
}: {
  micrositeId: string;
  initial: MicrositeContent | null;
  /** What the renderer uses when the SEO title override is blank. */
  defaultSeoTitle: string;
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="SEO title (browser tab + Google result)"
          htmlFor="ed_seo_title"
          hint={`Blank uses: ${defaultSeoTitle}`}
        >
          <Input
            id="ed_seo_title"
            value={draft.seo_title ?? ""}
            onChange={(e) => set("seo_title", e.target.value || null)}
            maxLength={120}
            placeholder={defaultSeoTitle}
          />
        </Field>
        <Field
          label="Meta description"
          htmlFor="ed_seo_desc"
          hint="Blank uses the subhead."
        >
          <Textarea
            id="ed_seo_desc"
            className="min-h-10"
            value={draft.seo_description ?? ""}
            onChange={(e) => set("seo_description", e.target.value || null)}
            maxLength={300}
          />
        </Field>
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
        {draft.sections.length < 6 ? (
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
