# LIQWD Design Kit — portable branding, layout & components

Everything needed to give another site the LIQWD look. Extracted verbatim
from the production codebase (liqwd.ca), so what's here is what actually
ships — not a re-description of it.

**Stack it assumes:** Next.js (App Router) + Tailwind **v4** + TypeScript.
Notes for other stacks are at the bottom — the tokens and the email template
are framework-agnostic.

## What's in here

| File | What it is |
| --- | --- |
| `tokens.css` | The design tokens + global CSS (Tailwind v4 `@theme` block, focus ring, hero grid, marquee). Drop-in replacement for `globals.css`. |
| `tokens.json` | The same palette/type/radius values as plain data — for Figma, emails, non-Tailwind stacks, or feeding to an AI. |
| `BRANDING.md` | The rules: voice, color usage, type scale, spacing, do/don't. Read this before designing new screens. |
| `lib/cn.ts` | Tiny className combiner used by every component (no deps). |
| `lib/section-accents.ts` | The five color-coded "zones" system (brand/emerald/sky/amber/slate). |
| `components/*.tsx` | Button, Card, Field/Input/Select/Textarea/Checkbox/Radio, Badge, Notice — the full primitive set. |
| `email-template.ts` | The transactional email shell (`brandedEmail`) + the deliberately-plain cold-outreach shell (`plainEmail`). Framework-free. |
| `PATTERNS.md` | Copy-paste page skeletons: marketing hero, dashboard zone header, form page, list+detail, empty state, flash messages. |
| `AI-PROMPT.md` | A single paste-able brief that teaches an AI assistant this design system in one shot. |

## Quick start (Next.js + Tailwind v4)

1. **Fonts** — in your root layout:

   ```tsx
   import { Geist, Geist_Mono, Inter_Tight } from "next/font/google";

   const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
   const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
   const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"] });

   // <html className={`${geistSans.variable} ${geistMono.variable} ${interTight.variable} h-full antialiased`}>
   ```

2. **CSS** — copy `tokens.css` over your `app/globals.css` (it already starts
   with `@import "tailwindcss"`).

3. **Components** — copy `lib/` and `components/` into `src/lib` and
   `src/components/ui`. They import from `@/lib/cn`; adjust if your alias
   differs. Only `Button` is a client component (it uses `useFormStatus` for
   automatic pending states) — drop that hook if you're not on React 19 /
   server actions.

4. **Display type** — put `className="display-type"` on marketing/consumer
   layouts so h1/h2 pick up Inter Tight. App/dashboard surfaces stay in Geist
   on purpose.

## Using it without Tailwind

`tokens.json` has every value. The palette is Tailwind's `teal` scale as
`brand-*`, ink is `#0b1220`, body text `#0f172a` (slate-900), borders
`#e2e8f0` (slate-200), muted text `#64748b`/`#94a3b8`. Radii: 8px controls,
12px cards, 16px panels. `email-template.ts` is plain string HTML with inline
styles and no dependencies at all — it works anywhere.

## Two things to change per site

1. **The wordmark.** LIQWD renders as `NAME` + a brand-teal period. Keep the
   construction, swap the name — or drop in your own mark.
2. **The accent.** Everything is neutral slate + ONE accent (teal). To
   re-skin, change only the `--color-brand-*` ramp in `tokens.css`; the whole
   system follows. Don't add a second accent — see BRANDING.md.
