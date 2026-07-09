"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { calcHstRebate, money } from "@/lib/calculators";

/** Interactive Ontario GST/HST new-housing rebate estimator. */
export function HstCalculator() {
  const [price, setPrice] = useState<string>("650000");

  const p = Math.max(0, Number(price.replace(/[^0-9.]/g, "")) || 0);
  const r = calcHstRebate(p);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Base price before HST (CAD)"
          htmlFor="hst-price"
          hint="Builder list prices for owner-occupiers usually already include HST net of these rebates."
        >
          <Input
            id="hst-price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
      </div>

      <dl className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">HST (13%)</dt>
          <dd className="font-medium text-ink">{money(r.hst)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Federal new-housing rebate</dt>
          <dd className="font-medium text-emerald-700">−{money(r.federalRebate)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Ontario new-housing rebate</dt>
          <dd className="font-medium text-emerald-700">−{money(r.ontarioRebate)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
          <dt className="font-semibold text-ink">Net HST after rebates</dt>
          <dd className="font-semibold text-ink">{money(r.netHst)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        Estimate for a new home in Ontario used as a primary residence.
        Investors renting the unit may qualify for the similar NRRP rebate
        instead. Confirm your situation with an accountant or lawyer.
      </p>
    </div>
  );
}
