# Page patterns — copy, paste, rename

Real skeletons from the production app, stripped of app logic. Imports assume
`@/components/ui/*` and `@/lib/cn`.

## 1. Marketing hero (public site)

Wrap the layout in `display-type` so h1/h2 pick up Inter Tight.

```tsx
<section className="relative overflow-hidden">
  <div className="hero-grid absolute inset-0" aria-hidden />
  <div className="relative mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
    <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
      Free for verified agents
    </span>
    <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
      Get free new-home buyer leads
    </h1>
    <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
      One sentence that says the outcome, not the feature.
    </p>
    <div className="mt-7 flex flex-wrap justify-center gap-3">
      <ButtonLink href="/signup" size="lg">Sign up free</ButtonLink>
      <ButtonLink href="/login" size="lg" variant="secondary">Log in</ButtonLink>
    </div>
    <p className="mt-3 text-xs text-slate-500">
      No obligation. The objection-killing line goes here.
    </p>
  </div>
</section>
```

## 2. Dashboard zone header (app surfaces)

The coloured panel that tells users which intent zone they're in.

```tsx
import { SECTION_ACCENT } from "@/lib/section-accents";
const a = SECTION_ACCENT.amber; // brand | emerald | sky | amber | slate

<div className={cn("rounded-2xl p-6 ring-1 ring-inset sm:p-8", a.zone)}>
  <span className={cn(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
    a.chip,
  )}>
    <Icon className="size-3" strokeWidth={2} aria-hidden /> Zone name
  </span>
  <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
    What this zone does for you
  </h1>
  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
    One or two sentences of orientation.
  </p>
</div>
```

## 3. Standard page shell

```tsx
<div className="space-y-6">
  <FlashNotice searchParams={sp} />
  <div>
    <h1 className="text-2xl font-semibold tracking-tight text-ink">Page title</h1>
    <p className="mt-1 text-slate-500">What this page is for, in one line.</p>
  </div>
  {/* sections, each a <Card> or a <section className="space-y-3"> */}
</div>
```

## 4. Stat row

```tsx
<div className="grid gap-3 sm:grid-cols-4">
  {stats.map((s) => (
    <Card key={s.label}>
      <CardBody>
        <p className="text-2xl font-semibold tabular-nums text-ink">{s.value}</p>
        <p className="mt-0.5 text-sm text-slate-500">{s.label}</p>
      </CardBody>
    </Card>
  ))}
</div>
```

## 5. Clickable card grid (the lift-on-hover treatment)

```tsx
<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((it) => (
    <Link key={it.slug} href={`/thing/${it.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <img src={it.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
        <CardBody>
          <h2 className="font-semibold text-ink group-hover:text-brand-700">{it.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{it.blurb}</p>
        </CardBody>
      </Card>
    </Link>
  ))}
</div>
```

## 6. Form page

Label above, control, hint below. Group related fields in a responsive grid.

```tsx
<Card>
  <CardBody>
    <form action={saveThing} className="space-y-4">
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" required maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required />
        </Field>
        <Field label="Phone" htmlFor="phone" hint="So we can actually reach you.">
          <Input id="phone" name="phone" type="tel" required />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-xs text-slate-500">
        <Checkbox name="consent" className="mt-0.5" />
        <span>Plain-language consent sentence — say what they're agreeing to.</span>
      </label>
      <Button type="submit">Save</Button>
    </form>
  </CardBody>
</Card>
```

## 7. Wizard (one question per screen)

The conversion pattern: progress bar, choice cards that auto-advance,
personal info last.

```tsx
<div className="mb-6">
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
    <div className="h-full rounded-full bg-brand-600 transition-all duration-300"
         style={{ width: `${(step / TOTAL) * 100}%` }} />
  </div>
  <p className="mt-2 text-xs font-medium text-slate-400">Step {step} / {TOTAL}</p>
</div>

<button type="button" onClick={pick}
  className={`rounded-xl border px-4 py-4 text-center text-sm font-medium transition-colors ${
    selected ? "border-brand-600 bg-brand-50 text-brand-800"
             : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700"}`}>
  {label}
</button>
```

## 8. List + detail

List rows are compact cards whose title links to the detail route; the row
also gets an explicit "Open →" affordance on the right.

```tsx
<Card>
  <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
    <div className="min-w-0">
      <Link href={`/things/${t.id}`} className="font-medium text-ink hover:text-brand-700">
        {t.title}
      </Link>
      <p className="mt-0.5 truncate text-xs text-slate-400">{t.meta}</p>
    </div>
    <Badge tone="neutral">{t.status}</Badge>
  </CardBody>
</Card>
```

## 9. Empty state

Explain what will appear here and give the next action. Never apologize.

```tsx
<Card>
  <CardBody className="py-10 text-center text-sm text-slate-500">
    No leads yet. They&apos;ll land here the moment someone registers —
    <Link href="/dashboard/lead-pages" className="text-brand-700 hover:underline"> share a lead page</Link> to start.
  </CardBody>
</Card>
```

## 10. Flash messages (server action → redirect → notice)

```tsx
// action:  redirectWithFlash("/path", "Saved.", "success")
// page:    <FlashNotice searchParams={sp} />
// Renders <Notice tone="success">Saved.</Notice> from ?flash=&flash_tone=
```

## 11. Section heading inside a page

```tsx
<h3 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
  Recently closed
</h3>
```

## 12. Disclaimer / fine print block

```tsx
<p className="mt-10 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
  What's true, as of when, and what the reader should verify themselves.
</p>
```
