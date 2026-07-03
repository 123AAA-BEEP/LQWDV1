import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Recruit-list importer — loads the top-producer CSV into recruit_targets.
 *   GET  ?key=…   a minimal upload form
 *   POST ?key=…   multipart file (field "file") or raw text/csv body
 * Expected header: full_name,email,brokerage,base_city,units,volume,source
 * Idempotent: duplicate emails are skipped (unique on lower(email)); rows
 * whose email is on the global suppression list import as status=suppressed
 * so no invite wave can ever pick them up.
 */

function authorized(url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  return Boolean(secret && url.searchParams.get("key") === secret);
}

const EMAIL_RE = /^[\w.+'-]+@[\w-]+\.[\w.-]+$/;

/** Small CSV parser handling quoted fields + embedded commas/newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const html = `<!doctype html><meta charset="utf-8"><title>Recruit import</title>
<body style="font-family:ui-sans-serif,system-ui;padding:40px;max-width:560px;margin:auto">
<h2>Import recruit list</h2>
<p>CSV with header: <code>full_name,email,brokerage,base_city,units,volume,source</code>.
Duplicates are skipped; suppressed emails import as unmailable.</p>
<form method="post" enctype="multipart/form-data">
  <input type="file" name="file" accept=".csv,text/csv" required />
  <button type="submit" style="margin-left:12px;padding:8px 16px">Import</button>
</form></body>`;
  return new Response(html, { headers: { "content-type": "text/html" } });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!authorized(url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let csvText: string;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "no file field" }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    csvText = await req.text();
  }
  if (!csvText.trim()) {
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return NextResponse.json({ error: "no data rows" }, { status: 400 });
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iName = col("full_name");
  const iEmail = col("email");
  const iBrokerage = col("brokerage");
  const iCity = col("base_city");
  const iUnits = col("units");
  const iVolume = col("volume");
  const iSource = col("source");
  if (iEmail < 0) {
    return NextResponse.json({ error: "missing email column" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Global suppression list — suppressed addresses import as unmailable.
  const { data: sup } = await admin.from("email_suppressions").select("email");
  const suppressed = new Set(
    ((sup ?? []) as { email: string }[]).map((s) => s.email.toLowerCase()),
  );

  const seen = new Set<string>();
  const records: Record<string, unknown>[] = [];
  let invalid = 0;
  for (const r of rows.slice(1)) {
    const email = (r[iEmail] ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      invalid++;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    const num = (i: number) => {
      if (i < 0) return null;
      const n = parseFloat((r[i] ?? "").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const str = (i: number) => {
      const v = i >= 0 ? (r[i] ?? "").trim() : "";
      return v ? v.slice(0, 200) : null;
    };
    records.push({
      email,
      full_name: str(iName),
      brokerage: str(iBrokerage),
      base_city: str(iCity),
      units_last_period: num(iUnits),
      volume_last_period: num(iVolume),
      source: str(iSource),
      status: suppressed.has(email) ? "suppressed" : "pending",
    });
  }

  let inserted = 0;
  let duplicates = 0;
  const errors: string[] = [];
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500);
    const { count, error } = await admin
      .from("recruit_targets")
      .upsert(chunk, {
        onConflict: "email",
        ignoreDuplicates: true,
        count: "exact",
      });
    if (error) {
      errors.push(`chunk ${i / 500}: ${error.message}`);
      continue;
    }
    inserted += count ?? 0;
    duplicates += chunk.length - (count ?? 0);
  }

  const { count: total } = await admin
    .from("recruit_targets")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    parsed_rows: rows.length - 1,
    valid_unique: records.length,
    invalid_emails: invalid,
    inserted,
    already_present: duplicates,
    imported_as_suppressed: records.filter((r) => r.status === "suppressed").length,
    table_total: total ?? 0,
    errors,
  });
}
