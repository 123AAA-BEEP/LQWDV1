"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { saveMicrositeSeo } from "../actions";

/**
 * Search appearance for every page of the microsite in one card: meta
 * titles, descriptions, sub-page H1s, and the focus keywords that steer
 * generation. Character counters follow Google's display limits (~60 title,
 * ~160 description) and go amber past them. No meta-keywords tag is ever
 * emitted (Google has ignored it since 2009); focus keywords only feed the
 * writing model.
 */

interface PageSeo {
  key: string;
  label: string;
  slug: string;
  heading: string;
  seo_title: string;
  meta_description: string;
}

function Counter({ len, max }: { len: number; max: number }) {
  return (
    <span className={len > max ? "text-amber-600" : "text-slate-400"}>
      {len}/{max}
    </span>
  );
}

export function MicrositeSeoEditor({
  micrositeId,
  domain,
  homeDefaults,
  home,
  pages,
}: {
  micrositeId: string;
  domain: string;
  /** What renders when the home overrides are blank. */
  homeDefaults: { title: string; description: string };
  home: { seo_title: string; seo_description: string; focus_keywords: string };
  pages: PageSeo[];
}) {
  const router = useRouter();
  const [h, setH] = useState(home);
  const [p, setP] = useState<PageSeo[]>(pages);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );

  const setPage = (key: string, patch: Partial<PageSeo>) =>
    setP((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const save = () =>
    startTransition(async () => {
      setNotice(null);
      const res = await saveMicrositeSeo({
        micrositeId,
        home: h,
        pages: Object.fromEntries(
          p.map((x) => [
            x.key,
            {
              heading: x.heading,
              seo_title: x.seo_title,
              meta_description: x.meta_description,
            },
          ]),
        ),
      });
      if (res?.error) setNotice({ text: res.error, error: true });
      else {
        setNotice({ text: "Saved. Changes are live on the next page load.", error: false });
        router.refresh();
      }
    });

  return (
    <div className="space-y-6">
      {/* Home page */}
      <div className="rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-ink">Home · {domain}</p>
        <div className="mt-3 space-y-3">
          <Field
            label={
              <>
                Meta title <Counter len={(h.seo_title || homeDefaults.title).length} max={60} />
              </>
            }
            htmlFor="seo_home_title"
            hint={h.seo_title ? undefined : `Blank uses: ${homeDefaults.title}`}
          >
            <Input
              id="seo_home_title"
              value={h.seo_title}
              onChange={(e) => setH({ ...h, seo_title: e.target.value })}
              placeholder={homeDefaults.title}
              maxLength={120}
            />
          </Field>
          <Field
            label={
              <>
                Meta description{" "}
                <Counter
                  len={(h.seo_description || homeDefaults.description).length}
                  max={160}
                />
              </>
            }
            htmlFor="seo_home_desc"
            hint={h.seo_description ? undefined : "Blank uses the subhead."}
          >
            <Textarea
              id="seo_home_desc"
              className="min-h-14"
              value={h.seo_description}
              onChange={(e) => setH({ ...h, seo_description: e.target.value })}
              placeholder={homeDefaults.description}
              maxLength={300}
            />
          </Field>
          <Field
            label="Focus keywords"
            htmlFor="seo_home_keywords"
            hint="Comma-separated. Steers the writing on regenerate; never emitted as a meta tag."
          >
            <Input
              id="seo_home_keywords"
              value={h.focus_keywords}
              onChange={(e) => setH({ ...h, focus_keywords: e.target.value })}
              placeholder="echo towns waterdown, stacked townhomes waterdown, echo towns prices"
              maxLength={300}
            />
          </Field>
        </div>
      </div>

      {/* Sub-pages */}
      {p.map((page) => (
        <div key={page.key} className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-ink">
            {page.label} · /{page.slug}
          </p>
          <div className="mt-3 space-y-3">
            <Field label="H1 heading" htmlFor={`seo_${page.key}_h1`}>
              <Input
                id={`seo_${page.key}_h1`}
                value={page.heading}
                onChange={(e) => setPage(page.key, { heading: e.target.value })}
                maxLength={120}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={
                  <>
                    Meta title <Counter len={page.seo_title.length} max={60} />
                  </>
                }
                htmlFor={`seo_${page.key}_title`}
              >
                <Input
                  id={`seo_${page.key}_title`}
                  value={page.seo_title}
                  onChange={(e) => setPage(page.key, { seo_title: e.target.value })}
                  maxLength={120}
                />
              </Field>
              <Field
                label={
                  <>
                    Meta description{" "}
                    <Counter len={page.meta_description.length} max={160} />
                  </>
                }
                htmlFor={`seo_${page.key}_desc`}
              >
                <Textarea
                  id={`seo_${page.key}_desc`}
                  className="min-h-14"
                  value={page.meta_description}
                  onChange={(e) =>
                    setPage(page.key, { meta_description: e.target.value })
                  }
                  maxLength={300}
                />
              </Field>
            </div>
          </div>
        </div>
      ))}

      {notice ? (
        <p
          role="status"
          className={notice.error ? "text-sm text-red-600" : "text-sm text-emerald-700"}
        >
          {notice.text}
        </p>
      ) : null}
      <Button type="button" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save search appearance"}
      </Button>
    </div>
  );
}
