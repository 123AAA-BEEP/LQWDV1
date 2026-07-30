import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Rocket, Wrench, Zap } from "lucide-react";
import { requireUserProfile, isDeveloper } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, Radio } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { cn } from "@/lib/cn";
import { SECTION_ACCENT } from "@/lib/section-accents";
import { registerLaunchInterest } from "./actions";

export const metadata: Metadata = { title: "Launch Services" };
export const dynamic = "force-dynamic";

/**
 * Launch Services — the "kitty" surface for the future standardized
 * sales-and-marketing framework. Target customer: mid-sized developers with
 * low-rise projects that need a boost selling or launching. Deliberately a
 * pick-a-direction menu (three flavours, not a blank canvas) with interest
 * capture — every submission tells us which package to standardize first.
 * The delivery framework is NOT built yet, on purpose.
 */

const FLAVOURS = [
  {
    value: "essentials",
    icon: Rocket,
    name: "Launch Essentials",
    tag: "Do it with our playbook",
    body: "The standardized launch kit, run by your team: listing optimization on LIQWD, agent eBlast to our verified realtor base, a launch-night push, and lead routing straight into your inbox.",
  },
  {
    value: "full-engine",
    icon: Zap,
    name: "Full Launch Engine",
    tag: "Done for you",
    body: "We run the launch: campaign creative, agent mobilization, event programming, buyer funnel, and weekly absorption reporting — one team accountable for the number.",
  },
  {
    value: "rescue",
    icon: Wrench,
    name: "Rescue & Re-Launch",
    tag: "For stalled projects",
    body: "For projects selling slower than the pro-forma: a diagnostic on pricing, product mix, and positioning, then a structured re-launch with fresh agent and buyer demand.",
  },
];

export default async function LaunchServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string; flash_tone?: string }>;
}) {
  const sp = await searchParams;
  const { profile } = await requireUserProfile();
  if (!isDeveloper(profile)) redirect("/dashboard");
  const a = SECTION_ACCENT.amber;

  return (
    <div className="space-y-6">
      <FlashNotice searchParams={sp} />
      <div className={cn("rounded-2xl p-6 ring-1 ring-inset sm:p-8", a.zone)}>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
            a.chip,
          )}
        >
          <Rocket className="size-3" strokeWidth={2} aria-hidden /> Launch
          Services
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Need your project launched — or un-stuck?
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Built for mid-sized developers with low-rise projects: pick a
          direction below and our team scopes it with you. Programs are
          rolling out now — registering interest puts you first in line and
          shapes what we build.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {FLAVOURS.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.value}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <Icon className="size-6 text-brand-600" aria-hidden />
                  <Badge tone="featured">Coming soon</Badge>
                </div>
                <h2 className="mt-3 font-semibold text-ink">{f.name}</h2>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {f.tag}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {f.body}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink">Get in line</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tell us about the project and which direction fits — our team
            responds within one business day.
          </p>
          <form action={registerLaunchInterest} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Project name" htmlFor="ls_project">
                <Input id="ls_project" name="project" required maxLength={200} />
              </Field>
              <Field label="City" htmlFor="ls_city">
                <Input id="ls_city" name="city" maxLength={120} />
              </Field>
              <Field label="Units" htmlFor="ls_units">
                <Input id="ls_units" name="units" maxLength={20} placeholder="e.g. 84" />
              </Field>
            </div>
            <Field label="Where are you at?" htmlFor="ls_stage">
              <Select id="ls_stage" name="stage" defaultValue="">
                <option value="">Select…</option>
                <option value="pre-launch">Pre-launch — planning the launch</option>
                <option value="launching-now">Launching in the next 90 days</option>
                <option value="selling-slow">Selling, slower than planned</option>
                <option value="stalled">Stalled — needs a reset</option>
              </Select>
            </Field>
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">
                Which direction fits?
              </legend>
              <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-slate-600">
                {FLAVOURS.map((f) => (
                  <label key={f.value} className="flex items-center gap-1.5">
                    <Radio name="flavour" value={f.value} />
                    {f.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Anything else? (optional)" htmlFor="ls_notes">
              <Textarea id="ls_notes" name="notes" className="min-h-16" maxLength={2000} />
            </Field>
            <Button type="submit">Register interest</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
