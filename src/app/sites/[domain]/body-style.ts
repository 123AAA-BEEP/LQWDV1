/**
 * Fine-detail treatment for microsite body copy, learned from the founder's
 * reference template: bullets become brand-coloured check chips with a
 * coloured bold lead-in phrase, so lists read as designed feature points
 * rather than default markdown discs. Colour comes from CSS vars set on the
 * page root (--msp = brand primary, --msp-soft = 10% tint).
 */

export const MS_BODY_CSS = `
.ms-body ul{list-style:none;padding-left:0}
.ms-body ul>li{position:relative;padding-left:2.1rem;margin-top:.65rem;line-height:1.65}
.ms-body ul>li::before{content:"✓";position:absolute;left:0;top:.18rem;display:flex;align-items:center;justify-content:center;width:1.4rem;height:1.4rem;border-radius:9999px;font-size:.72rem;font-weight:700;color:var(--msp);background:var(--msp-soft)}
.ms-body ol>li{margin-top:.65rem;line-height:1.65}
.ms-lead{color:var(--msp);font-weight:600}
`;

/**
 * Colours the "Lead-in:" phrase at the start of list items. Runs on
 * renderMarkdown output, which escapes all input first — the only HTML here
 * is renderMarkdown's own fixed tag set, so this span injection is safe.
 */
export function decorateBody(html: string): string {
  return html.replace(
    /<li>([^<:]{3,48}):\s*/g,
    '<li><span class="ms-lead">$1:</span> ',
  );
}
