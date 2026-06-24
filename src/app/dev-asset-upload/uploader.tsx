"use client";

import { useRef, useState } from "react";

const ENDPOINT =
  "https://mzdqlhopxfknwqxxuonn.supabase.co/functions/v1/liqwd-put-asset";
const PUBLIC_BASE =
  "https://mzdqlhopxfknwqxxuonn.supabase.co/storage/v1/object/public/project-media";

type Slot = { key: string; path: string; title: string; hint: string };
const SLOTS: Slot[] = [
  {
    key: "hero",
    path: "landing/dev-hero.jpg",
    title: "Developer hero",
    hint: "Big rendering behind the stat card (Verified brokers / 3,500+ realtors).",
  },
  {
    key: "discreet",
    path: "landing/dev-discreet.jpg",
    title: "Discreet visual (section 02)",
    hint: "Clean rendering behind the “Sell it without naming it” overlay.",
  },
  {
    key: "demand",
    path: "landing/dev-demand.jpg",
    title: "Demand visual (section 03)",
    hint: "Rendering behind the “Real buyers, now” overlay.",
  },
  {
    key: "promote",
    path: "landing/dev-promote.jpg",
    title: "Promote visual (section 04)",
    hint: "Rendering behind the “Reach on demand” overlay.",
  },
];

function Dropzone({ slot }: { slot: Slot }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle",
  );
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(`${PUBLIC_BASE}/${slot.path}`);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setMsg("That's not an image file.");
      return;
    }
    setStatus("uploading");
    setMsg(`Uploading ${file.name}…`);
    try {
      const body = new FormData();
      body.append("path", slot.path);
      body.append("file", file);
      const res = await fetch(ENDPOINT, { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus("done");
      setMsg("Live. It may take up to a minute to refresh on the site.");
      setPreview(`${PUBLIC_BASE}/${slot.path}?t=${Date.now()}`);
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">{slot.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{slot.hint}</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        className={`mt-4 flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          drag
            ? "border-brand-500 bg-brand-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400"
        }`}
      >
        <span className="text-sm font-medium text-slate-700">
          Drag an image here, or click to choose
        </span>
        <span className="text-xs text-slate-400">JPG / PNG / WebP · up to 8MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />

      {status !== "idle" ? (
        <p
          className={`mt-3 text-sm ${
            status === "error"
              ? "text-red-600"
              : status === "done"
                ? "text-brand-700"
                : "text-slate-500"
          }`}
        >
          {msg}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element -- live preview from storage */}
        <img
          src={preview}
          alt={`${slot.title} preview`}
          className="block w-full"
        />
      </div>
      <p className="mt-1 text-center text-[11px] text-slate-400">
        Current live image
      </p>
    </div>
  );
}

export function Uploader() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Developer landing — image upload
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Drop your renderings straight from your computer. They go live on the{" "}
        <a href="/developers" className="text-brand-600 hover:underline">
          /developers
        </a>{" "}
        page within about a minute — no code change, no redeploy. Replacing an
        image here overwrites the previous one.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {SLOTS.map((s) => (
          <Dropzone key={s.key} slot={s} />
        ))}
      </div>
    </div>
  );
}
