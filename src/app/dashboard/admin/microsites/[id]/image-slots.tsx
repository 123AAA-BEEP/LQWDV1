"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { saveMicrositeImageSlots } from "../actions";

/**
 * Founder-controlled image placement: pin any gallery image to any slot
 * (after the intro, or beside any section), force a slot empty, or leave it
 * on auto. Pins live on the config, so Regenerate never moves them.
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
}: {
  micrositeId: string;
  media: MediaOpt[];
  /** Generated sections (key + title); empty before first generation. */
  sections: { key: string; title: string }[];
  initial: { intro?: string; sections?: Record<string, string> };
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

  const save = () =>
    startTransition(async () => {
      setNotice(null);
      const res = await saveMicrositeImageSlots({
        micrositeId,
        intro,
        sections: secs,
      });
      if (res?.error) setNotice({ text: res.error, error: true });
      else {
        setNotice({ text: "Placement saved — the page uses it immediately.", error: false });
        router.refresh();
      }
    });

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
      {slotRow("After the intro", intro, setIntro)}
      {sections.map((s) =>
        slotRow(s.title, secs[s.key] ?? "", (v) =>
          setSecs((prev) => {
            const next = { ...prev };
            if (v) next[s.key] = v;
            else delete next[s.key];
            return next;
          }),
        ),
      )}
      {sections.length === 0 ? (
        <p className="text-xs text-slate-400">
          Section slots appear here after the first Generate.
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className={notice.error ? "text-sm text-red-600" : "text-sm text-emerald-700"}
        >
          {notice.text}
        </p>
      ) : null}
      <Button type="button" variant="secondary" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save image placement"}
      </Button>
    </div>
  );
}
