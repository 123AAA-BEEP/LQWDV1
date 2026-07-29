"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { submitMatchRequest, type MatchedAgent } from "./actions";

/**
 * The agent-match wizard — one question per screen, micro-commitments before
 * PII, escape hatches on every soft question. Adapted from the
 * realestateagents.com funnel with our differences: the matched agents are
 * revealed INSTANTLY as real profiles (no email/SMS gate), and the consent
 * line is one honest CASL sentence.
 */

type Intent = "buying" | "selling" | "both";

const PRICE_BANDS: { value: string; label: string }[] = [
  { value: "under-500k", label: "Under $500K" },
  { value: "500k-750k", label: "$500K – $750K" },
  { value: "750k-1m", label: "$750K – $1M" },
  { value: "1m-1.5m", label: "$1M – $1.5M" },
  { value: "1.5m-2m", label: "$1.5M – $2M" },
  { value: "over-2m", label: "$2M+" },
];

const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: "detached", label: "Detached" },
  { value: "semi", label: "Semi-detached" },
  { value: "townhouse", label: "Townhome" },
  { value: "condo", label: "Condo" },
  { value: "land", label: "Land / lot" },
  { value: "other", label: "Other" },
];

const TIMELINES: { value: string; label: string }[] = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-3-months", label: "1–3 months" },
  { value: "3-6-months", label: "3–6 months" },
  { value: "6-plus-months", label: "6+ months" },
  { value: "exploring", label: "Just exploring" },
];

const TOTAL_STEPS = 7;

function ChoiceCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-4 text-center text-sm font-medium transition-colors ${
        selected
          ? "border-brand-600 bg-brand-50 text-brand-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700"
      }`}
    >
      {label}
    </button>
  );
}

export function MatchWizard({
  cities,
  defaultCity,
  source,
}: {
  cities: string[];
  defaultCity?: string;
  source?: string;
}) {
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState<"form" | "analyzing" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<MatchedAgent[]>([]);

  const [intent, setIntent] = useState<Intent | null>(null);
  const [priceBand, setPriceBand] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [city, setCity] = useState(defaultCity ?? "");
  const [address, setAddress] = useState("");
  const [timeline, setTimeline] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));
  const pick = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    next();
  };

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Please tell us your name and email so agents can reach you.");
      return;
    }
    setError(null);
    setPhase("analyzing");
    const fd = new FormData();
    fd.set("intent", intent ?? "buying");
    fd.set("price_band", priceBand);
    fd.set("property_type", propertyType);
    fd.set("city", city);
    fd.set("address", address);
    fd.set("timeline", timeline);
    fd.set("name", name);
    fd.set("email", email);
    fd.set("phone", phone);
    if (source) fd.set("source", source);
    // The reveal moment: run the real submit alongside a minimum delay so the
    // "finding your agents" beat lands, without ever faking longer than 2s.
    const [result] = await Promise.all([
      submitMatchRequest(fd),
      new Promise((r) => setTimeout(r, 1800)),
    ]);
    if (result && "error" in result && result.error) {
      setError(result.error);
      setPhase("form");
      return;
    }
    setAgents(result && "agents" in result ? (result.agents ?? []) : []);
    setPhase("done");
  };

  if (phase === "analyzing") {
    return (
      <div className="py-16 text-center" role="status" aria-live="polite">
        <p className="text-2xl font-semibold text-ink">
          Finding your agents{city ? ` in ${city}` : ""}…
        </p>
        <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" />
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Checking verified profiles and client reviews…
        </p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div role="status" aria-live="polite">
        {agents.length > 0 ? (
          <>
            <p className="text-2xl font-semibold text-ink">
              Your matched agent{agents.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Verified LIQWD agents{city ? ` for ${city}` : ""} — read their
              reviews and reach out directly. They&apos;ve been notified about
              your request and may reach out shortly; we&apos;ve also emailed
              you this shortlist.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {agents.map((a) => (
                <Link
                  key={a.slug ?? a.name}
                  href={a.slug ? `/realtors/${a.slug}` : "#"}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {a.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatar_url}
                      alt=""
                      className="mx-auto size-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                      {a.name.slice(0, 1)}
                    </div>
                  )}
                  <p className="mt-3 font-semibold text-ink group-hover:text-brand-700">
                    {a.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[a.title, a.brokerage].filter(Boolean).join(" · ")}
                  </p>
                  <span className="mt-3 inline-block text-sm font-medium text-brand-700">
                    View profile →
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-ink">
              Your shortlist is being prepared
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              We&apos;re matching you with the right agent
              {city ? ` for ${city}` : ""} and will follow up by email shortly
              — usually same-day. Free, no obligation.
            </p>
          </>
        )}
        <p className="mt-6 text-sm text-slate-500">
          Meanwhile —{" "}
          <Link href="/projects" className="text-brand-700 hover:underline">
            browse new-construction homes
          </Link>
          {intent !== "buying" ? (
            <>
              {" "}
              or{" "}
              <Link href="/home-value" className="text-brand-700 hover:underline">
                see what your home is worth
              </Link>
            </>
          ) : null}
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-slate-400">
          Step {step} / {TOTAL_STEPS}
        </p>
      </div>

      {step === 1 ? (
        <fieldset>
          <legend className="text-2xl font-semibold text-ink">
            What brings you here?
          </legend>
          <p className="mt-1 text-sm text-slate-500">
            Free agent matching — no strings attached.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ChoiceCard
              label="I'm buying"
              selected={intent === "buying"}
              onClick={() => {
                setIntent("buying");
                next();
              }}
            />
            <ChoiceCard
              label="I'm selling"
              selected={intent === "selling"}
              onClick={() => {
                setIntent("selling");
                next();
              }}
            />
            <ChoiceCard
              label="Buying & selling"
              selected={intent === "both"}
              onClick={() => {
                setIntent("both");
                next();
              }}
            />
          </div>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <fieldset>
          <legend className="text-2xl font-semibold text-ink">
            {intent === "buying"
              ? "What's your budget?"
              : "What price are you hoping to sell at?"}
          </legend>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {PRICE_BANDS.map((b) => (
              <ChoiceCard
                key={b.value}
                label={b.label}
                selected={priceBand === b.value}
                onClick={() => pick(setPriceBand)(b.value)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => pick(setPriceBand)("not-sure")}
            className="mt-4 text-sm text-slate-500 underline-offset-2 hover:text-brand-700 hover:underline"
          >
            Not sure yet
          </button>
        </fieldset>
      ) : null}

      {step === 3 ? (
        <fieldset>
          <legend className="text-2xl font-semibold text-ink">
            {intent === "buying"
              ? "What kind of home are you after?"
              : "What kind of property are you selling?"}
          </legend>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {PROPERTY_TYPES.map((t) => (
              <ChoiceCard
                key={t.value}
                label={t.label}
                selected={propertyType === t.value}
                onClick={() => pick(setPropertyType)(t.value)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 4 ? (
        <div>
          <h2 className="text-2xl font-semibold text-ink">
            {intent === "buying" ? "Where are you looking?" : "Where's the property?"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            So we can match agents who know the area
            {intent !== "buying" ? " and have sold similar homes" : ""}.
          </p>
          <div className="mt-5 space-y-4">
            <Field label="City" htmlFor="mw_city">
              <Select
                id="mw_city"
                value={cities.includes(city) ? city : city ? "__other" : ""}
                onChange={(e) => {
                  if (e.target.value !== "__other") setCity(e.target.value);
                  else setCity("");
                }}
              >
                <option value="">Select a city…</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__other">Somewhere else</option>
              </Select>
            </Field>
            {!cities.includes(city) ? (
              <Field label="Or type your city / town" htmlFor="mw_city_other">
                <Input
                  id="mw_city_other"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Georgina"
                />
              </Field>
            ) : null}
            {intent !== "buying" ? (
              <Field
                label="Property address (optional)"
                htmlFor="mw_address"
                hint="Helps match agents with nearby sales — you can skip it."
              >
                <Input
                  id="mw_address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={240}
                  placeholder="e.g. 123 Main St"
                />
              </Field>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <fieldset>
          <legend className="text-2xl font-semibold text-ink">
            What&apos;s your timeline?
          </legend>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {TIMELINES.map((t) => (
              <ChoiceCard
                key={t.value}
                label={t.label}
                selected={timeline === t.value}
                onClick={() => pick(setTimeline)(t.value)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 6 ? (
        <div>
          <h2 className="text-2xl font-semibold text-ink">What&apos;s your name?</h2>
          <p className="mt-1 text-sm text-slate-500">
            Matching is free — this is who your agents will be introduced to.
          </p>
          <div className="mt-5">
            <Field label="Full name" htmlFor="mw_name">
              <Input
                id="mw_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                autoComplete="name"
                placeholder="e.g. Alex Karczewski"
              />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 7 ? (
        <div>
          <h2 className="text-2xl font-semibold text-ink">
            Where should your shortlist go?
          </h2>
          <p className="mt-1 text-sm text-slate-500">Last step.</p>
          <div className="mt-5 space-y-4">
            <Field label="Email" htmlFor="mw_email">
              <Input
                id="mw_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={320}
                autoComplete="email"
                required
              />
            </Field>
            <Field
              label="Phone (optional)"
              htmlFor="mw_phone"
              hint="A quick call is usually the fastest way for an agent to help."
            >
              <Input
                id="mw_phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                autoComplete="tel"
              />
            </Field>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {/* Nav — choice steps advance on tap; input steps use Next. */}
      <div className="mt-8 flex items-center justify-between">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={back}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {step === 4 ? (
          <Button type="button" onClick={next} disabled={!city.trim()}>
            Next
          </Button>
        ) : null}
        {step === 6 ? (
          <Button type="button" onClick={next} disabled={!name.trim()}>
            Next
          </Button>
        ) : null}
        {step === 7 ? (
          <Button type="button" onClick={submit} disabled={!email.trim()}>
            See my agents →
          </Button>
        ) : null}
      </div>

      {step === 7 ? (
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Free and no obligation. By submitting, you agree that LIQWD and your
          matched agent(s) may contact you about this request by email or
          phone. No spam, and your details are never sold.
        </p>
      ) : null}
    </div>
  );
}
