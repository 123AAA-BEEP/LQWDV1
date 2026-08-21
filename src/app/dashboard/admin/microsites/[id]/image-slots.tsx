"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";
import { saveMicrositeImageSlots } from "../actions";

/**
 * Founder-controlled image placement: pin any gallery image to any slot
 * (after the intro, or beside any section), force a slot empty, or leave it
 * on auto. Pins live on the config, so Regenerate never moves them.
 * Every change AUTO-SAVES immediately — no separate save step to forget.
 */

interface MediaOpt {
  url: string;
  label: string;
}

export function MicrositeImageSlots({
  micrositeId,
  media,
  sections,
  initial,
  builderLogoUrl,
}: {
  micrositeId: string;
  media: MediaOpt[];
  /** Generated sections (key + title); empty before first generation. */
  sections: { key: string; title: string }[];
  initial: { intro?: string; sections?: Record<string, string> };
  /** When set, the builder section always shows the logo — slot locked. */
  builderLogoUrl?: string | null;
}) {
  const router = useRouter();
  const [intro, setIntro] = useState(initial.intro ?? "");
  const [secs, setSecs] = useState<Record<string, string>>(
    initial.sections ?? {},
  );
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );

  const persist = (nextIntro: string, nextSecs: Record<string, string>) =>
    startTransition(async () => {
      setNotice(null);
      const res = await saveMicrositeImageSlots({
        micrositeId,
        intro: nextIntro,
        sections: nextSecs,
      });
      if (res?.error) setNotice({ text: res.error, error: true });
      else {
        setNotice({ text: "Saved — refresh the preview to see it.", error: false });
        router.refresh();
      }
    });

  const changeIntro = (v: string) => {
    setIntro(v);
    persist(v, secs);
  };
  const changeSection = (key: string, v: string) => {
    const next = { ...secs };
    if (v) next[key] = v;
    else delete next[key];
    setSecs(next);
    persist(intro, next);
  };

  const preview = (v: string) =>
    v && v !== "none" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={v}
        alt=""
        className="h-12 w-16 shrink-0 rounded-md border border-slate-200 object-cover"
      />
    ) : (
      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] text-slate-400">
        {v === "none" ? "hidden" : "auto"}
      </span>
    );

  const slotRow = (
    label: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="flex items-center gap-3">
      {preview(value)}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">{label}</p>
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
          disabled={pending}
        >
          <option value="">Auto (gallery, then stock)</option>
          <option value="none">No image</option>
          {media.map((m) => (
            <option key={m.url} value={m.url}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {slotRow("After the intro", intro, changeIntro)}
      {sections.map((s) =>
        s.key === "builder" && builderLogoUrl ? (
          <div key={s.key} className="flex items-center gap-3">
            <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={builderLogoUrl}
                alt="Developer logo"
                className="max-h-10 w-auto max-w-full object-contain"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700">
                {s.title}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Always shows the developer logo (manage it in the logo card
                above; remove the logo to use a photo here).
              </p>
            </div>
          </div>
        ) : (
          <div key={s.key}>
            {slotRow(s.title, secs[s.key] ?? "", (v) => changeSection(s.key, v))}
          </div>
        ),
      )}
      {sections.length === 0 ? (
        <p className="text-xs text-slate-400">
          Section slots appear here after the first Generate.
        </p>
      ) : null}
      <p
        role="status"
        className={
          notice
            ? notice.error
              ? "text-sm text-red-600"
              : "text-sm text-emerald-700"
            : "text-xs text-slate-400"
        }
      >
        {pending
          ? "Saving…"
          : (notice?.text ?? "Changes save automatically.")}
      </p>
    </div>
  );
}
