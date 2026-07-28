/**
 * Minimal, safe markdown → HTML for article bodies. Escape-first by design:
 * ALL input is HTML-escaped before any transform runs, so raw HTML in the
 * source can never reach the page — only the tags this renderer itself emits
 * exist in the output. Supports exactly what the article generator is allowed
 * to produce (## / ### headings, paragraphs, bulleted + numbered lists,
 * **bold**, *italic*, http(s)/internal links). No dependency on a markdown
 * package on purpose — a full parser is a bigger attack surface than the
 * four constructs we need.
 */

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Bold, italic, and links — applied to already-escaped text. */
function inline(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(
      // http(s) or site-relative targets only; quotes are already escaped so
      // the href can't be broken out of.
      /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]*)\)/g,
      '<a href="$2" class="text-brand-700 underline underline-offset-2 hover:text-brand-800">$1</a>',
    );
}

const P = 'class="mt-4 leading-relaxed text-slate-600"';
const H2 = 'class="mt-10 text-2xl font-semibold tracking-tight text-ink"';
const H3 = 'class="mt-7 text-lg font-semibold text-ink"';
const UL = 'class="mt-4 list-disc space-y-1.5 pl-5 text-slate-600"';
const OL = 'class="mt-4 list-decimal space-y-1.5 pl-5 text-slate-600"';

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p ${P}>${inline(escapeHtml(para.join(" ")))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const tag = list.ordered ? "ol" : "ul";
      const attrs = list.ordered ? OL : UL;
      out.push(
        `<${tag} ${attrs}>${list.items.map((i) => `<li>${i}</li>`).join("")}</${tag}>`,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushPara();
      flushList();
      const text = inline(escapeHtml(h[2]));
      // Everything h1/h2 renders as h2 (the page owns its single h1).
      out.push(
        h[1].length <= 2 ? `<h2 ${H2}>${text}</h2>` : `<h3 ${H3}>${text}</h3>`,
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flushPara();
      const item = inline(escapeHtml((bullet ?? numbered)![1]));
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(item);
      continue;
    }

    flushList();
    para.push(trimmed);
  }
  flushPara();
  flushList();
  return out.join("\n");
}

/** Plain-text preview (index cards, meta fallbacks). */
export function markdownToPlainText(md: string, max = 240): string {
  const text = md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
