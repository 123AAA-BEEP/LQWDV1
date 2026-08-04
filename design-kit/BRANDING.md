# LIQWD design system — the rules

The look in one line: **premium, minimal, neutral foundation with exactly one
confident accent.** Slate ink, generous white space, teal used sparingly for
what matters. It should read closer to a fintech dashboard than a real-estate
portal.

## Colour

**Neutral does the work; teal points.** Backgrounds are white or a faint
slate wash. Text is slate. Teal (`brand-600/700`) appears on links, active
states, focus rings, and small emphasis marks — not on large fields.

- **Primary buttons are ink (`#0b1220`), not teal.** Teal is the accent, not
  the call to action. This is the single easiest way to get the look wrong.
- **One accent, forever.** No second brand colour, no purple gradients, no
  neon. Re-skinning means replacing the `--color-brand-*` ramp — nothing
  else.
- **Colour carries meaning, not decoration**: emerald = money/success, amber
  = promote/attention, red = destructive, sky = explore/data, slate =
  neutral. The five zone accents (`lib/section-accents.ts`) map navigation to
  intent so a user knows where they are by colour alone.
- **Tints are faint**: `bg-*-50/60` with a `ring-*-100`. If a tinted panel
  reads as "coloured", it's too strong.

## Type

- **Two families, deliberate split.** Geist everywhere; **Inter Tight for
  h1/h2 on marketing and consumer pages only** (via the `.display-type`
  wrapper), set at weight 650 with `-0.025em` tracking. App and dashboard
  headings stay in Geist — product surfaces shouldn't shout.
- **Headlines**: `tracking-tight` + `text-balance`, sentence case. Never all-caps
  headlines; uppercase is only for tiny kickers at `tracking-[0.14em]`.
- **Body copy**: `text-sm leading-relaxed` in UI, `text-lg` for marketing
  ledes. Secondary text `text-slate-500`, metadata `text-xs text-slate-400`.
- **Numbers**: always `tabular-nums` for stats, counts, prices.

## Shape & depth

- Radii ladder: **8px** controls → **12px** cards → **16px** panels → full
  pills for badges/chips. Never mix a 4px radius in.
- Depth is a hairline border (`border-slate-200`) plus `shadow-sm`. Heavy
  shadows are reserved for hover on clickable cards
  (`group-hover:-translate-y-0.5 group-hover:shadow-lg`).
- Dividers over boxes: `divide-y divide-slate-100` inside cards beats nesting
  more borders.

## Layout

- Vertical rhythm is `space-y-6` between page sections; `space-y-3` between
  list items.
- Container widths carry meaning: `max-w-3xl` for reading (articles, forms),
  `max-w-4xl` for hubs, `max-w-6xl` for grids.
- Public pages: `px-6 py-12 sm:py-16`. Cards: `p-5`. Zone panels: `p-6 sm:p-8`.
- Grids are `sm:grid-cols-2 lg:grid-cols-3` with `gap-6`; stat rows are
  `sm:grid-cols-3` or `-4` with `gap-3`.

## Components

- **Buttons**: primary = ink fill; secondary = white with slate border; ghost
  = text only; danger = red fill. Sizes `sm/md/lg` map to `h-9/h-10/h-12`.
  Submit buttons show a spinner and self-disable while a form action runs.
- **Cards**: `rounded-xl border border-slate-200 bg-white shadow-sm`, body
  `p-5`. Clickable cards get the lift-on-hover treatment.
- **Badges**: pill, `text-xs font-medium`, tinted `-100` background with
  `-800` text. `featured` is the one solid tone (amber-500 on white) so
  promotional state never reads as a status.
- **Notices**: bordered tinted strip, one line of copy, tone-matched.
- **Forms**: label above, control, then a small hint below. Controls are
  `rounded-lg border-slate-300` with `focus:border-brand-600` — and the global
  focus ring must never be removed.

## Voice

- **Say the outcome, not the feature.** "Get free buyer leads" beats
  "lead-generation platform".
- Second person, active, plain. Short sentences. No exclamation marks, no
  hype adjectives ("revolutionary", "cutting-edge"), no emoji in product UI.
- **Honesty as a differentiator**: if something is coming soon, say "coming
  soon" — never fake it. If a number is uncertain, don't state it. Facts get
  verified; judgments don't get invented.
- Empty states explain what will appear and what to do next; they never
  apologize.
- Microcopy carries the trust load: under a CTA, say the thing that removes
  the objection ("Free. No obligation.").

## Accessibility (non-negotiable)

- Keep the 2px brand focus ring on every interactive element.
- Icons are `aria-hidden`; interactive elements get real labels.
- Status changes render in `role="status" aria-live="polite"` regions.
- Honour `prefers-reduced-motion`.
- Body text is slate-600 or darker on white — never lighter for "elegance".

## Don't

- Don't use teal as a large background fill or on primary buttons.
- Don't introduce a second accent colour or a gradient.
- Don't use display type in the app/dashboard.
- Don't stack shadows and borders and tints on the same element.
- Don't write headlines in all caps.
- Don't remove focus rings.
