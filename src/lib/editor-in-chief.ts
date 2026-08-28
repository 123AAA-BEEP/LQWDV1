import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pingIndexNow } from "@/lib/indexnow";

/**
 * The editor-in-chief pass — the quality gate that lets the pipeline publish
 * without a human in the loop. Every generated draft is read by a second,
 * adversarial model call playing a demanding magazine editor who thinks like
 * a Google Search Quality Rater (helpful-content, E-E-A-T): it edits the
 * piece for reader value and scannability, tightens the SEO fields, and
 * returns a verdict.
 *
 *   publish     → the piece goes live immediately (edited version).
 *   needs_human → the piece stays in the review queue with the editor's
 *                 notes prepended-to-nothing — admin sees why it was held.
 *
 * The one rule that makes auto-publish safe: THE EDITOR MAY NEVER ADD
 * FACTS. It can cut, restructure, and clarify, but every number, name, and
 * claim must already exist in the draft (whose own generator was grounded).
 * Brokerage pieces get web_search to spot-check claims against sources —
 * any claim that fails the check forces needs_human.
 */

export interface EditorResult {
  verdict: "publish" | "needs_human";
  notes: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  seo_title: string | null;
  seo_meta_description: string | null;
}

interface ArticleRow {
  id: string;
  slug?: string;
  article_type: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  seo_title: string | null;
  seo_meta_description: string | null;
  related_project_ids: string[];
}

const SYSTEM =
  "You are the editor-in-chief of LIQWD Insights, a blog about Ontario new-construction real estate. You are the LAST gate before publication — no human reads after you, so hold the bar of a demanding magazine editor AND a Google Search Quality Rater assessing helpful, people-first content (E-E-A-T). " +
  "YOUR JOB: (a) EDIT the piece so it reads excellently — tighten flabby sentences, sharpen the lede so the reader's question is answered early, improve scannability (headings every 150-250 words, lists where they help), cut filler, fix the SEO title (<=60 chars, query-intent first) and meta description (140-160 chars). (b) JUDGE whether it should publish. " +
  "ABSOLUTE RULE — NEVER ADD FACTS: you may cut, reorder, and rephrase, but every number, price, name, date, and factual claim in your edited version must already appear in the draft. If a section is thin, tighten it; do not pad it with new claims. Keep the markdown subset (## / ### headings, paragraphs, lists, **bold**, links) and NEVER remove a '## Sources' section or an italic disclaimer block if present. " +
  "VERDICT needs_human WHEN ANY of: a factual claim looks invented or unattributed where the piece style requires attribution; anything promises investment returns or appreciation; the piece reads generic enough that a rater would call it unhelpful filler even after your edit; a named brand or person is treated unfairly or disparagingly; a spot-check against a source fails. Otherwise verdict publish. " +
  "In notes: 1-3 sentences — what you changed, and (for needs_human) exactly what a human must fix or verify.";

const EMIT: Anthropic.Messages.Tool = {
  name: "emit_review",
  description: "Return the edited article and your verdict. Call exactly once, last.",
  input_schema: {
    type: "object" as const,
    properties: {
      verdict: { type: "string", enum: ["publish", "needs_human"] },
      notes: { type: "string", description: "1-3 sentences: what changed / what to fix" },
      title: { type: "string" },
      excerpt: { type: "string" },
      body_md: { type: "string", description: "The full edited body in markdown" },
      seo_title: { type: "string", description: "<= 60 chars" },
      seo_meta_description: { type: "string", description: "140-160 chars" },
    },
    required: ["verdict", "notes", "title", "excerpt", "body_md", "seo_title", "seo_meta_description"],
  },
};

const TYPE_CONTEXT: Record<string, string> = {
  project_spotlight:
    "This is a project spotlight grounded in the project's public listing data.",
  neighbourhood_guide:
    "This is a neighbourhood guide grounded in public listing data.",
  comparison: "This is a project comparison grounded in public listing data.",
  market_update:
    "This is a market note. External facts must be attributed and reflected in its '## Sources' section — treat unattributed external claims as invented.",
  agent_guide:
    "This is an evergreen guide for new Ontario real-estate agents. Practical advice is fine; regulatory claims should be hedged toward 'confirm with RECO'.",
  consumer_guide:
    "This is a plain-language guide for consumers (buyers/owners, not agents). Extra scrutiny on tax/legal claims: HST and income-tax statements must be attributed and hedged toward 'confirm with your accountant/lawyer' — an unattributed or unhedged tax claim forces needs_human. Jargon must be defined; any LIQWD tool link appears at most once.",
  brokerage_profile:
    "This is a deep dive on a NAMED brokerage brand. HIGHEST scrutiny: use web_search (up to 3 searches) to spot-check the 2-3 most consequential claims (splits/fees/caps). Attributed, clearly framed figures are FINE — including office-specific or third-party-reported ones ('one GTA office advertised…', 'a 2025 report cited…'); a closing disclaimer already tells readers terms vary by office and to confirm locally. What forces needs_human: a bare number stated as unattributed fact, a figure that contradicts what your spot-check finds, or framing that presents one office's reported terms as the brand's universal policy.",
  brokerage_comparison:
    "This compares two NAMED brokerage brands. HIGHEST scrutiny: use web_search (up to 3 searches) to spot-check the most consequential claims for each brand. Attributed, clearly framed figures are fine (see the office-variance disclaimer at the end); both brands must get fair, equal treatment with no winner declared. needs_human for: bare unattributed numbers, failed spot-checks, one-office terms framed as universal policy, or unequal treatment.",
};

/**
 * Runs the editor pass. Returns null on API failure — callers treat that as
 * needs_human (the gate fails closed, never open).
 */
export async function editArticle(
  article: ArticleRow,
): Promise<EditorResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const isBrokerage = article.article_type.startsWith("brokerage_");
  const tools: Anthropic.Messages.ToolUnion[] = isBrokerage
    ? [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }, EMIT]
    : [EMIT];

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content:
        `${TYPE_CONTEXT[article.article_type] ?? ""}\n\n` +
        `DRAFT TITLE: ${article.title}\n` +
        `DRAFT EXCERPT: ${article.excerpt ?? "(none)"}\n` +
        `DRAFT SEO TITLE: ${article.seo_title ?? "(none)"}\n` +
        `DRAFT META DESCRIPTION: ${article.seo_meta_description ?? "(none)"}\n\n` +
        `DRAFT BODY:\n${article.body_md}\n\n` +
        "Edit and judge it now. Call emit_review exactly once.",
    },
  ];

  try {
    const client = new Anthropic();
    for (let round = 0; round < 4; round++) {
      const res = await client.messages.create(
        {
          model: "claude-sonnet-5",
          max_tokens: 6000,
          cache_control: { type: "ephemeral" },
          system: SYSTEM,
          tools,
          messages,
        },
        { timeout: 90_000 },
      );

      const emit = res.content.find(
        (b): b is Anthropic.Messages.ToolUseBlock =>
          b.type === "tool_use" && b.name === "emit_review",
      );
      if (emit) {
        const out = emit.input as Record<string, unknown>;
        const str = (k: string) =>
          typeof out[k] === "string" ? (out[k] as string).trim() : "";
        if (!str("title") || !str("body_md")) return null;
        // A vanished Sources section on a sourced piece = the edit broke the
        // piece's evidence trail; fail closed.
        if (
          /##\s*Sources/i.test(article.body_md) &&
          !/##\s*Sources/i.test(str("body_md"))
        ) {
          return null;
        }
        return {
          verdict: out.verdict === "publish" ? "publish" : "needs_human",
          notes: str("notes"),
          title: str("title"),
          excerpt: str("excerpt") || null,
          body_md: str("body_md"),
          seo_title: str("seo_title") || null,
          seo_meta_description: str("seo_meta_description") || null,
        };
      }

      if (res.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: res.content });
        continue;
      }
      if (round === 0) {
        messages.push({ role: "assistant", content: res.content });
        messages.push({
          role: "user",
          content: "Call emit_review now with your edited version and verdict.",
        });
        continue;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Hero image from OUR OWN library — never ripped from the web (copyright).
 * Project-grounded pieces use their first related project's rendering;
 * market notes borrow the newest published hero; brokerage/agent pieces get
 * none by design (brand imagery = trademark territory).
 */
export async function pickHeroImage(
  admin: SupabaseClient,
  article: Pick<ArticleRow, "article_type" | "related_project_ids">,
): Promise<string | null> {
  if (article.related_project_ids.length > 0) {
    const { data } = await admin
      .from("public_projects_view")
      .select("hero_image_url")
      .in("project_id", article.related_project_ids)
      .not("hero_image_url", "is", null)
      .limit(1);
    const url = (data as { hero_image_url: string | null }[] | null)?.[0]
      ?.hero_image_url;
    if (url) return url;
  }
  if (article.article_type === "market_update") {
    const { data } = await admin
      .from("public_projects_view")
      .select("hero_image_url")
      .not("hero_image_url", "is", null)
      .order("published_at", { ascending: false })
      .limit(1);
    return (
      (data as { hero_image_url: string | null }[] | null)?.[0]
        ?.hero_image_url ?? null
    );
  }
  return null;
}

/**
 * The full finishing move for a generated draft: attach a hero, run the
 * editor, then publish (verdict=publish) or hold in the review queue with
 * the editor's notes (anything else — the gate fails closed). Returns the
 * final status.
 */
export async function finishAndPublish(
  admin: SupabaseClient,
  articleId: string,
): Promise<"published" | "in_review"> {
  const { data } = await admin
    .from("articles")
    .select(
      "id, slug, article_type, title, excerpt, body_md, seo_title, seo_meta_description, related_project_ids",
    )
    .eq("id", articleId)
    .maybeSingle();
  const article = (data as ArticleRow | null) ?? null;
  if (!article) return "in_review";

  const hero = await pickHeroImage(admin, article);
  const result = await editArticle(article);

  if (!result) {
    await admin
      .from("articles")
      .update({
        status: "in_review",
        editor_notes:
          "Editor pass failed to complete — held for human review (gate fails closed).",
        ...(hero ? { hero_image_url: hero } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);
    return "in_review";
  }

  const publish = result.verdict === "publish";
  await admin
    .from("articles")
    .update({
      title: result.title,
      excerpt: result.excerpt,
      body_md: result.body_md,
      seo_title: result.seo_title,
      seo_meta_description: result.seo_meta_description,
      editor_notes: result.notes || null,
      ...(hero ? { hero_image_url: hero } : {}),
      status: publish ? "published" : "in_review",
      ...(publish ? { published_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", articleId);
  if (publish && article.slug) {
    void pingIndexNow([`/insights/${article.slug}`, "/insights"]);
  }
  return publish ? "published" : "in_review";
}
