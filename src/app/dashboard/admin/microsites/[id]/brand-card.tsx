"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import {
  BRAND_FONTS,
  SERIF_FONTS,
  type MicrositeBrand,
} from "@/lib/microsite-brand";
import { saveMicrositeBrand, extractMicrositeBrand } from "../actions";

/**
 * Brand styling module: pick the palette and typeface by hand, or pull them
 * straight off any project image (logo, site map, rendering) with a vision
 * pass. What's pinned here beats the generator's hero extraction and
 * survives every regeneration.
 */

const DEFAULTS: MicrositeBrand = {
  primary: "#0d9488",
  accent: "#14b8a6",
  heading_font: "Inter",
  font_stack: "sans-serif",
};

export function MicrositeBrandCard({
  micrositeId,
  pinned,
  generated,
  images,
  logoUrl,
}: {
  micrositeId: string;
  /** The founder-pinned override, if any. */
  pinned: MicrositeBrand | null;
  /** What generation extracted from the hero (shown when nothing is pinned). */
  generated: MicrositeBrand | null;
  images: { url: string; label: string }[];
  logoUrl: string | null;
}) {
  const router = useRouter();
  const [brand, setBrand] = useState<MicrositeBrand>(
    pinned ?? generated ?? DEFAULTS,
  );
  const [pending, startTransition] = useTransition();
  const [busyUrl, setBusyUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );

  const patch = (p: Partial<MicrositeBrand>) =>
    setBrand((b) => ({ ...b, ...p }));

  const save = (next: MicrositeBrand | null) =>
    startTransition(async () => {
      setNotice(null);
      const res = await saveMicrositeBrand({ micrositeId, brand: next });
      if (res?.error) setNotice({ text: res.error, error: true });
      else {
        setNotice({
          text: next ? "Brand pinned — it beats generation from now on." : "Override cleared.",
          error: false,
        });
        if (!next) setBrand(generated ?? DEFAULTS);
        router.refresh();
      }
    });

  const extract = (url: string) => {
    setBusyUrl(url);
    setNotice(null);
    startTransition(async () => {
      const res = await extractMicrositeBrand({ micrositeId, imageUrl: url });
      setBusyUrl(null);
      if (res?.error) setNotice({ text: res.error, error: true });
      else if (res?.brand) {
        setBrand(res.brand);
        setNotice({
          text: `Pulled ${res.brand.heading_font} and ${res.brand.primary} from that image.`,
          error: false,
        });
        router.refresh();
      }
    });
  };

  const swatches = [
    { label: "Buttons", value: brand.primary },
    { label: "Accent", value: brand.accent },
  ];
  const sources = [
    ...(logoUrl ? [{ url: logoUrl, label: "Developer logo" }] : []),
    ...images,
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        {swatches.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              className="h-9 w-9 rounded-lg border border-slate-200"
              style={{ backgroundColor: s.value }}
            />
            <div className="text-xs">
              <p className="font-medium text-slate-700">{s.label}</p>
              <p className="font-mono text-slate-400">{s.value}</p>
            </div>
          </div>
        ))}
        <p
          className="text-2xl text-ink"
          style={{ fontFamily: `'${brand.heading_font}', ${brand.font_stack}` }}
        >
          {brand.heading_font}
        </p>
        <span className="text-xs text-slate-400">
          {pinned ? "pinned" : generated ? "from generation" : "defaults"}
        </span>
      </div>

      <div className="grid items-end gap-3 sm:grid-cols-4">
        <Field label="Buttons (hex)" htmlFor="bc_primary">
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Pick button colour"
              value={brand.primary}
              onChange={(e) => patch({ primary: e.target.value })}
              className="h-9 w-10 cursor-pointer rounded border border-slate-200"
            />
            <Input
              id="bc_primary"
              value={brand.primary}
              onChange={(e) => patch({ primary: e.target.value })}
              maxLength={7}
            />
          </div>
        </Field>
        <Field label="Accent (hex)" htmlFor="bc_accent">
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Pick accent colour"
              value={brand.accent}
              onChange={(e) => patch({ accent: e.target.value })}
              className="h-9 w-10 cursor-pointer rounded border border-slate-200"
            />
            <Input
              id="bc_accent"
              value={brand.accent}
              onChange={(e) => patch({ accent: e.target.value })}
              maxLength={7}
            />
          </div>
        </Field>
        <Field label="Heading font" htmlFor="bc_font">
          <Select
            id="bc_font"
            value={brand.heading_font}
            onChange={(e) =>
              patch({
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
        <div className="flex gap-2">
          <Button type="button" onClick={() => save(brand)} disabled={pending}>
            {pending ? "Saving…" : "Pin brand"}
          </Button>
          {pinned ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => save(null)}
              disabled={pending}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700">
          Or pull the styling from an image
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          The logo or a site map usually carries the builder&apos;s truest
          palette. Reads colours and typography, then pins them.
        </p>
        {sources.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            Upload an image or a developer logo first.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {sources.map((img) => (
              <div key={img.url} className="space-y-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.label}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-lg border border-slate-200 bg-white object-contain p-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  disabled={pending}
                  onClick={() => extract(img.url)}
                >
                  {busyUrl === img.url ? "Reading…" : "Use styling"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {notice ? (
        <p
          role="status"
          className={notice.error ? "text-sm text-red-600" : "text-sm text-emerald-700"}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
