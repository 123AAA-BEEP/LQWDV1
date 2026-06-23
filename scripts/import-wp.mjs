#!/usr/bin/env node
/**
 * WordPress -> LIQWD importer (Mississauga pilot).
 *
 * Pulls the `project` posts for ONE WordPress `location` term from the MyCondoPro
 * REST API, derives the public-safe FACTS, optionally uses Claude to (a) extract
 * the spec fields buried in the body HTML and (b) generate fresh, original
 * marketing + SEO copy, downloads referenced images, and loads everything into
 * Supabase as DRAFTS (record_status='draft' — nothing is published or indexable).
 *
 * It never re-publishes source prose: the body HTML is used ONLY as input for
 * fact extraction. All public-facing copy is generated new.
 *
 * Phases (run in order; everything lands in scripts/out/):
 *   node scripts/import-wp.mjs fetch     # REST pull            -> out/raw.json      (needs egress to WP_BASE)
 *   node scripts/import-wp.mjs build     # derive clean facts   -> out/projects.json + out/review.csv
 *   node scripts/import-wp.mjs extract   # Claude: spec fields  (needs ANTHROPIC_API_KEY)
 *   node scripts/import-wp.mjs generate  # Claude: fresh copy   (needs ANTHROPIC_API_KEY)
 *   node scripts/import-wp.mjs images    # download images      -> out/images/<slug>/   (add --upload to push to bucket)
 *   node scripts/import-wp.mjs load      # upsert DRAFTS         (add --commit to actually write to Supabase)
 *
 * Env (auto-loaded from .env.local at repo root if present):
 *   WP_BASE                default https://mycondopro.ca
 *   WP_LOCATION_ID         default 518   (Mississauga)
 *   WP_CITY_NAME           default Mississauga
 *   WP_PROVINCE            default Ontario
 *   ANTHROPIC_API_KEY      (extract/generate)   ANTHROPIC_MODEL default claude-sonnet-4-6
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (load)
 *   SUPABASE_MEDIA_BUCKET  default project-media
 *
 * Allowlist these hosts in the environment's egress settings to run here:
 *   mycondopro.ca, api.anthropic.com, <your-project>.supabase.co
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "out");

// ---------------------------------------------------------------------------
// Tiny .env.local loader (the app uses Next's loader; standalone node doesn't).
// ---------------------------------------------------------------------------
function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  const txt = readFileSync(file, "utf8");
  for (const raw of txt.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const WP_BASE = (process.env.WP_BASE || "https://mycondopro.ca").replace(/\/$/, "");
const LOCATION_ID = process.env.WP_LOCATION_ID || "518";
const CITY_NAME = process.env.WP_CITY_NAME || "Mississauga";
const PROVINCE = process.env.WP_PROVINCE || "Ontario";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || "project-media";
const EXTERNAL_SOURCE = "mycondopro";

const RAW_FILE = path.join(OUT, "raw.json");
const PROJECTS_FILE = path.join(OUT, "projects.json");
const REVIEW_CSV = path.join(OUT, "review.csv");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#039;": "'",
  "&#39;": "'", "&#8217;": "’", "&#8216;": "‘", "&#8220;": "“",
  "&#8221;": "”", "&#8211;": "–", "&#8212;": "—", "&nbsp;": " ",
  "&#8230;": "…",
};
function decodeEntities(s = "") {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m);
}
function htmlToText(html = "") {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
/** `.../foo-768x997.jpg` -> `.../foo.jpg` (the full-res original). */
function originalImageUrl(url) {
  return url.replace(/-\d+x\d+(\.[a-z]+)(\?.*)?$/i, "$1");
}
function uniq(arr) {
  return [...new Set(arr)];
}

/** MyCondoPro `tags` taxonomy (selling status) -> LIQWD enums. */
function mapStatus(tagSlugs = []) {
  const s = new Set(tagSlugs);
  let sales_status = "unknown";
  let construction_status = "preconstruction";
  if (s.has("sold-out")) { sales_status = "sold_out"; construction_status = "unknown"; }
  else if (s.has("new-release") || s.has("promotional")) sales_status = "selling";
  else if (s.has("platinum-access")) sales_status = "coming_soon";
  else if (s.has("coming-soon")) sales_status = "coming_soon";
  else if (s.has("planning")) { sales_status = "coming_soon"; construction_status = "preconstruction"; }
  return { sales_status, construction_status };
}

async function ensureOut() {
  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });
}
async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
async function writeJson(file, data) {
  await writeFile(file, JSON.stringify(data, null, 2));
}
function log(...a) {
  console.log(...a);
}

async function wpGet(url) {
  const res = await fetch(url, { headers: { "User-Agent": "liqwd-importer" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// PHASE: fetch
// ---------------------------------------------------------------------------
async function phaseFetch() {
  await ensureOut();
  const posts = [];
  for (let page = 1; page <= 50; page++) {
    const url = `${WP_BASE}/wp-json/wp/v2/project?location=${LOCATION_ID}&per_page=100&page=${page}&_embed`;
    let res;
    try {
      res = await wpGet(url);
    } catch (err) {
      if (String(err).includes("rest_post_invalid_page_number") || String(err).includes("-> 400")) break;
      throw err;
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    posts.push(...batch);
    const totalPages = Number(res.headers.get("x-wp-totalpages") || "1");
    log(`  fetched page ${page}/${totalPages} (${batch.length} posts)`);
    if (page >= totalPages) break;
  }

  // Gallery media per project (featured + _embed only gives the hero).
  for (const p of posts) {
    try {
      const res = await wpGet(`${WP_BASE}/wp-json/wp/v2/media?parent=${p.id}&per_page=100&_fields=source_url,alt_text,caption`);
      p.__media = await res.json();
    } catch {
      p.__media = [];
    }
  }

  await writeJson(RAW_FILE, posts);
  log(`fetch: ${posts.length} projects -> ${path.relative(ROOT, RAW_FILE)}`);
}

// ---------------------------------------------------------------------------
// PHASE: build  (clean facts, no AI)
// ---------------------------------------------------------------------------
function collectImages(post) {
  const urls = [];
  const featured = post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  if (featured) urls.push(featured);
  for (const m of post.__media || []) if (m.source_url) urls.push(m.source_url);
  const body = post?.content?.rendered || "";
  const re = /https?:\/\/[^"')\s]+\/wp-content\/uploads\/[^"')\s]+\.(?:jpe?g|png|webp|gif)/gi;
  for (const m of body.match(re) || []) urls.push(m);
  return uniq(urls.map(originalImageUrl));
}

function termSlugs(post, taxonomy) {
  const groups = post?._embedded?.["wp:term"] || [];
  const out = [];
  for (const g of groups) for (const t of g || []) if (t.taxonomy === taxonomy) out.push(t);
  // class_list fallback (always present even without _embed)
  if (out.length === 0 && Array.isArray(post.class_list)) {
    const prefix = taxonomy === "tags" ? "tags-" : `${taxonomy}-`;
    return post.class_list.filter((c) => c.startsWith(prefix)).map((c) => ({ slug: c.slice(prefix.length), name: null, parent: null }));
  }
  return out;
}

function buildRecord(post) {
  const locTerms = termSlugs(post, "location");
  const tagTerms = termSlugs(post, "tags");
  const tagSlugList = tagTerms.map((t) => t.slug);
  const { sales_status, construction_status } = mapStatus(tagSlugList);

  // neighbourhood = a location term whose parent is the target city term
  const hood = locTerms.find((t) => String(t.parent) === String(LOCATION_ID));
  const heroFeatured = post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;

  return {
    // identity / source
    source_id: post.id,
    external_source: EXTERNAL_SOURCE,
    external_source_url: post.link,
    // facts (clean, from the API)
    slug: String(post.slug || "").toLowerCase(),
    project_name: decodeEntities(post?.title?.rendered || "").trim(),
    city: CITY_NAME,
    municipality: CITY_NAME,
    province: PROVINCE,
    neighbourhood: hood ? decodeEntities(hood.name || hood.slug) : null,
    sales_status,
    construction_status,
    source_status_tags: tagSlugList,
    hero_image_url: originalImageUrl(heroFeatured || ""),
    images: collectImages(post),
    // raw text used ONLY as extraction input (never republished verbatim)
    _body_text: htmlToText(post?.content?.rendered || ""),
    // spec fields — filled by `extract`
    builder_name: null, builder_names_raw: null, architect_name: null,
    interior_designer_name: null, ownership_type: null, project_type: null,
    address_full: null, intersection_primary: null,
    storeys: null, total_units: null, bedrooms_summary: null,
    size_range_sqft_min: null, size_range_sqft_max: null,
    price_from_public: null, price_to_public: null, occupancy_estimate_text: null,
    _extract_confidence: null, _extract_notes: null,
    // generated copy — filled by `generate`
    headline: null, page_summary: null, page_description: null,
    description_ai_draft: null, seo_title: null, seo_meta_description: null,
  };
}

async function phaseBuild() {
  const posts = await readJson(RAW_FILE);
  const records = posts
    .map(buildRecord)
    .filter((r) => r.slug && r.project_name);
  await writeJson(PROJECTS_FILE, records);

  const stub = records.filter((r) => !r._body_text || r._body_text.length < 120).length;
  const cols = ["slug", "project_name", "neighbourhood", "sales_status", "construction_status"];
  const csv = [
    cols.join(","),
    ...records.map((r) =>
      cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");
  await writeFile(REVIEW_CSV, csv);

  log(`build: ${records.length} projects (${stub} look like empty stubs)`);
  log(`  -> ${path.relative(ROOT, PROJECTS_FILE)}`);
  log(`  -> ${path.relative(ROOT, REVIEW_CSV)}  (review the facts before generating)`);
}

// ---------------------------------------------------------------------------
// Claude
// ---------------------------------------------------------------------------
async function claude(system, user, maxTokens = 1500) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.map((b) => b.text).join("") ?? "";
}
function parseJsonLoose(s) {
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : s;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return JSON.parse(body.slice(start, end + 1));
}

// ---------------------------------------------------------------------------
// PHASE: extract  (spec fields from body text)
// ---------------------------------------------------------------------------
const EXTRACT_SYSTEM =
  "You extract structured facts about a pre-construction real-estate project from messy source text. " +
  "Return ONLY JSON. Use null when a fact is not clearly stated — never guess or invent. " +
  "Numbers must be plain numbers (no $ or commas). Keep Canadian spelling.";

async function phaseExtract() {
  const records = await readJson(PROJECTS_FILE);
  let done = 0;
  for (const r of records) {
    if (!r._body_text || r._body_text.length < 60) continue;
    const user = `PROJECT: ${r.project_name}\nCITY: ${r.city}\n\nSOURCE TEXT:\n${r._body_text.slice(0, 6000)}\n\nReturn JSON with exactly these keys: builder_name, builder_names_raw, architect_name, interior_designer_name, ownership_type, project_type, address_full, intersection_primary, storeys, total_units, bedrooms_summary, size_range_sqft_min, size_range_sqft_max, price_from_public, price_to_public, occupancy_estimate_text, _confidence (0-1), _notes.`;
    try {
      const out = parseJsonLoose(await claude(EXTRACT_SYSTEM, user, 900));
      Object.assign(r, {
        builder_name: out.builder_name ?? null,
        builder_names_raw: out.builder_names_raw ?? out.builder_name ?? null,
        architect_name: out.architect_name ?? null,
        interior_designer_name: out.interior_designer_name ?? null,
        ownership_type: out.ownership_type ?? null,
        project_type: out.project_type ?? null,
        address_full: out.address_full ?? null,
        intersection_primary: out.intersection_primary ?? null,
        storeys: numOrNull(out.storeys),
        total_units: numOrNull(out.total_units),
        bedrooms_summary: out.bedrooms_summary ?? null,
        size_range_sqft_min: numOrNull(out.size_range_sqft_min),
        size_range_sqft_max: numOrNull(out.size_range_sqft_max),
        price_from_public: numOrNull(out.price_from_public),
        price_to_public: numOrNull(out.price_to_public),
        occupancy_estimate_text: out.occupancy_estimate_text ?? null,
        _extract_confidence: out._confidence ?? null,
        _extract_notes: out._notes ?? null,
      });
      done++;
      log(`  extracted ${r.slug} (conf ${out._confidence ?? "?"})`);
    } catch (err) {
      r._extract_notes = `extract failed: ${String(err).slice(0, 140)}`;
      log(`  ! ${r.slug}: ${r._extract_notes}`);
    }
  }
  await writeJson(PROJECTS_FILE, records);
  log(`extract: filled specs for ${done}/${records.length} projects`);
}
function numOrNull(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------------------
// PHASE: generate  (fresh, original copy + SEO)
// ---------------------------------------------------------------------------
const GEN_SYSTEM =
  "You are a real-estate copywriter for a Canadian pre-construction brokerage. " +
  "Write ORIGINAL marketing copy from the supplied facts only — do not copy phrasing from any source, " +
  "do not invent facts not given, use Canadian spelling, no hype clichés. Return ONLY JSON.";

async function phaseGenerate() {
  const records = await readJson(PROJECTS_FILE);
  let done = 0;
  for (const r of records) {
    const facts = {
      project_name: r.project_name, city: r.city, neighbourhood: r.neighbourhood,
      builder_name: r.builder_name, architect_name: r.architect_name,
      address_full: r.address_full, intersection_primary: r.intersection_primary,
      storeys: r.storeys, total_units: r.total_units, bedrooms_summary: r.bedrooms_summary,
      size_range_sqft_min: r.size_range_sqft_min, size_range_sqft_max: r.size_range_sqft_max,
      price_from_public: r.price_from_public, price_to_public: r.price_to_public,
      occupancy_estimate_text: r.occupancy_estimate_text, sales_status: r.sales_status,
    };
    const user = `FACTS (JSON):\n${JSON.stringify(facts, null, 2)}\n\nReturn JSON with keys: headline (<=80 chars), page_summary (1 sentence), page_description (2-3 short paragraphs, plain text), description_ai_draft (longer, 3-4 paragraphs), seo_title (<=60 chars, include the city), seo_meta_description (<=155 chars).`;
    try {
      const out = parseJsonLoose(await claude(GEN_SYSTEM, user, 1600));
      Object.assign(r, {
        headline: out.headline ?? null,
        page_summary: out.page_summary ?? null,
        page_description: out.page_description ?? null,
        description_ai_draft: out.description_ai_draft ?? null,
        seo_title: out.seo_title ?? null,
        seo_meta_description: out.seo_meta_description ?? null,
      });
      done++;
      log(`  generated ${r.slug}`);
    } catch (err) {
      log(`  ! ${r.slug}: generate failed ${String(err).slice(0, 140)}`);
    }
  }
  await writeJson(PROJECTS_FILE, records);
  log(`generate: wrote fresh copy for ${done}/${records.length} projects`);
}

// ---------------------------------------------------------------------------
// PHASE: images  (download; --upload pushes to the Supabase bucket)
// ---------------------------------------------------------------------------
async function phaseImages(flags) {
  const records = await readJson(PROJECTS_FILE);
  const upload = flags.has("--upload");
  const supabase = upload ? supa() : null;
  let count = 0;
  for (const r of records) {
    const dir = path.join(OUT, "images", r.slug);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    for (const url of r.images || []) {
      const name = decodeURIComponent(url.split("/").pop().split("?")[0]);
      const dest = path.join(dir, name);
      try {
        if (!existsSync(dest)) {
          const res = await wpGet(url);
          const buf = Buffer.from(await res.arrayBuffer());
          await writeFile(dest, buf);
          count++;
        }
        if (upload) {
          const buf = await readFile(dest);
          const key = `import/${r.slug}/${name}`;
          const { error } = await supabase.storage
            .from(MEDIA_BUCKET)
            .upload(key, buf, { upsert: true, contentType: guessMime(name) });
          if (error) log(`  ! upload ${key}: ${error.message}`);
        }
      } catch (err) {
        log(`  ! image ${url}: ${String(err).slice(0, 120)}`);
      }
    }
    log(`  ${r.slug}: ${(r.images || []).length} images`);
  }
  log(`images: downloaded ${count} files to ${path.relative(ROOT, path.join(OUT, "images"))}${upload ? " (and uploaded to bucket)" : ""}`);
}
function guessMime(name) {
  const e = name.toLowerCase().split(".").pop();
  return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" }[e] || "application/octet-stream";
}

// ---------------------------------------------------------------------------
// PHASE: load  (upsert DRAFTS into Supabase; --commit to actually write)
// ---------------------------------------------------------------------------
function supa() {
  const { createClient } = require("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function phaseLoad(flags) {
  const commit = flags.has("--commit");
  const records = await readJson(PROJECTS_FILE);
  if (!commit) {
    log(`load: DRY RUN — ${records.length} projects would be upserted as drafts. Re-run with --commit to write.`);
    log(records.slice(0, 5).map((r) => `  - ${r.slug} | ${r.project_name} | ${r.neighbourhood ?? "-"} | ${r.sales_status}`).join("\n"));
    return;
  }
  const supabase = supa();
  let ok = 0;
  for (const r of records) {
    const project = {
      slug: r.slug,
      project_name: r.project_name,
      headline: r.headline,
      description_long: r.page_description,
      description_ai_draft: r.description_ai_draft,
      project_type: r.project_type,
      construction_status: r.construction_status,
      sales_status: r.sales_status,
      ownership_type: r.ownership_type,
      builder_name: r.builder_name,
      builder_names_raw: r.builder_names_raw,
      architect_name: r.architect_name,
      interior_designer_name: r.interior_designer_name,
      address_full: r.address_full,
      city: r.city,
      municipality: r.municipality,
      province: r.province,
      neighbourhood: r.neighbourhood,
      intersection_primary: r.intersection_primary,
      occupancy_estimate_text: r.occupancy_estimate_text,
      storeys: r.storeys,
      total_units: r.total_units,
      bedrooms_summary: r.bedrooms_summary,
      size_range_sqft_min: r.size_range_sqft_min,
      size_range_sqft_max: r.size_range_sqft_max,
      price_from_public: r.price_from_public,
      price_to_public: r.price_to_public,
      is_seeded: true,
      public_page_enabled: false,
      record_status: "draft",
      external_source: r.external_source,
      external_source_url: r.external_source_url,
      import_notes: r._extract_notes || null,
    };
    const { data, error } = await supabase
      .from("projects")
      .upsert(project, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) { log(`  ! ${r.slug}: ${error.message}`); continue; }

    const page = {
      project_id: data.id,
      slug: r.slug,
      is_active: false,
      indexable: false,
      page_title: r.project_name,
      page_summary: r.page_summary,
      page_description: r.page_description,
      seo_title: r.seo_title,
      seo_meta_description: r.seo_meta_description,
    };
    const { error: pErr } = await supabase
      .from("public_project_pages")
      .upsert(page, { onConflict: "slug" });
    if (pErr) { log(`  ! page ${r.slug}: ${pErr.message}`); continue; }
    ok++;
    log(`  loaded ${r.slug}`);
  }
  log(`load: upserted ${ok}/${records.length} draft projects`);
}

// ---------------------------------------------------------------------------
// PHASE: check  (egress preflight — verify the required hosts are allowlisted)
// ---------------------------------------------------------------------------
function hostOf(u) { try { return new URL(u).host; } catch { return u; } }
function isAllowlistError(err) {
  return /not in allowlist/i.test(String(err && err.message ? err.message : err));
}
function allowlistHelp() {
  return [
    "Egress blocked: a required host is not in this environment's network allowlist.",
    "",
    "Fix (Claude Code on the web):",
    "  1. Open the environment selector (cloud icon) and edit the environment this session uses.",
    "  2. Set 'Network access' to 'Custom', then add to 'Allowed domains' (one per line):",
    `       ${hostOf(WP_BASE)}`,
    "       *.supabase.co",
    "       api.anthropic.com",
    "     and tick 'Also include default list of common package managers'.",
    "  3. Save, then START A NEW SESSION — allowlist changes never reach an already-running one.",
  ].join("\n");
}

async function probe(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "liqwd-importer" } });
    const body = res.ok ? "" : await res.text().catch(() => "");
    return { status: res.status, blocked: res.status === 403 && /not in allowlist/i.test(body) };
  } catch (err) {
    return { status: 0, blocked: false, error: String(err).slice(0, 140) };
  }
}

async function phaseCheck() {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const targets = [
    { url: `${WP_BASE}/wp-json/`, need: "fetch + images" },
    { url: "https://api.anthropic.com/v1/models", need: "extract + generate" },
  ];
  if (supaUrl) targets.push({ url: `${supaUrl.replace(/\/$/, "")}/auth/v1/health`, need: "load + upload" });

  let blocked = false;
  for (const t of targets) {
    const r = await probe(t.url);
    if (r.blocked) blocked = true;
    const state = r.blocked ? "BLOCKED" : r.status ? "ok " : "ERR";
    const detail = r.blocked ? "  <- not in allowlist" : r.error ? `  ${r.error}` : `  HTTP ${r.status}`;
    log(`  [${state}] ${hostOf(t.url).padEnd(28)} (${t.need})${detail}`);
  }
  if (blocked) { log("\n" + allowlistHelp()); process.exit(1); }
  log("\ncheck: all probed hosts reachable.");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith("--")));
const phases = { check: phaseCheck, fetch: phaseFetch, build: phaseBuild, extract: phaseExtract, generate: phaseGenerate, images: () => phaseImages(flags), load: () => phaseLoad(flags) };

if (!phases[cmd]) {
  console.error(`Usage: node scripts/import-wp.mjs <check|fetch|build|extract|generate|images|load> [--upload|--commit]`);
  process.exit(1);
}
phases[cmd]().catch((err) => {
  if (isAllowlistError(err)) {
    console.error(String(err.message || err).split("\n")[0] + "\n");
    console.error(allowlistHelp());
  } else {
    console.error(err);
  }
  process.exit(1);
});
