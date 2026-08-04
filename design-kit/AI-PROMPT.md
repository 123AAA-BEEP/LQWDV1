# One-paste brief for an AI assistant

Paste everything below into Claude Code (or any coding assistant) on the
other project, ideally with `tokens.css`, `tokens.json`, `BRANDING.md`, and
`PATTERNS.md` attached or copied into the repo.

---

You are building UI for a site that must match an existing design system.
Follow these rules exactly; when something isn't covered, choose the most
restrained option.

**Foundation.** Neutral slate + white, with exactly ONE accent: teal
(`brand-50…900`, Tailwind's teal ramp; `brand-600` = `#0d9488`). Near-black
"ink" is `#0b1220`. Body text slate-900, secondary slate-600, metadata
slate-400. Borders slate-200. Never introduce a second accent, a gradient, or
neon.

**The one rule people get wrong: primary buttons are INK, not teal.** Teal is
for links, active states, focus rings, and small emphasis — never a large
fill or a primary CTA.

**Type.** Geist for everything; Inter Tight for h1/h2 on marketing and
consumer pages only (via a `.display-type` wrapper), weight 650, tracking
`-0.025em`. Headlines are sentence case with `tracking-tight` and
`text-balance`. Uppercase only for tiny kickers at `tracking-[0.14em]`.
Numbers use `tabular-nums`.

**Shape.** Radii ladder: 8px controls → 12px cards → 16px panels → full pills
for badges/chips. Depth = hairline border + `shadow-sm`. Heavy shadow only on
hover for clickable cards (`group-hover:-translate-y-0.5
group-hover:shadow-lg`, `duration-300`).

**Layout.** `space-y-6` between page sections. Containers: `max-w-3xl` for
reading, `max-w-4xl` for hubs, `max-w-6xl` for grids. Public pages use
`px-6 py-12 sm:py-16`. Cards `p-5`. Grids `sm:grid-cols-2 lg:grid-cols-3
gap-6`.

**Components.** Use the provided Button / Card / Field / Badge / Notice
primitives rather than hand-rolling. Button variants: primary (ink),
secondary (white + slate border), ghost, danger. Sizes sm/md/lg = h-9/h-10/h-12.
Badges are pills with `-100` background and `-800` text. Notices are bordered
tinted strips.

**Colour means something.** Emerald = money/success, amber = promote/attention,
red = destructive, sky = explore/data, slate = neutral. Don't use colour
decoratively.

**Voice.** Second person, active, plain, outcome-first ("Get free buyer
leads", not "lead-generation platform"). Short sentences. No exclamation
marks, no hype adjectives, no emoji in product UI. If a feature isn't ready,
say "coming soon" rather than faking it. Under a CTA, add the microcopy that
removes the objection ("Free. No obligation."). Empty states say what will
appear here and what to do next — never apologize.

**Accessibility is non-negotiable.** Keep the global 2px brand focus ring on
every interactive element; icons `aria-hidden`; status updates in
`role="status" aria-live="polite"`; honour `prefers-reduced-motion`; never
lighten body text below slate-600 on white.

**Never:** teal primary buttons · a second accent or gradient · display type
in app/dashboard surfaces · stacked shadow+border+tint on one element ·
all-caps headlines · removed focus rings.

When you build a screen, start from the matching skeleton in `PATTERNS.md`
(hero, zone header, page shell, stat row, card grid, form, wizard,
list+detail, empty state, flash, fine print) and change only what the content
requires.
