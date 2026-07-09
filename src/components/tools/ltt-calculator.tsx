"use client";

import { useState } from "react";
import { Field, Input, Checkbox } from "@/components/ui/field";
import { calcLtt, money } from "@/lib/calculators";

/** Interactive Ontario + Toronto land-transfer-tax calculator. */
export function LttCalculator() {
  const [price, setPrice] = useState<string>("800000");
  const [inToronto, setInToronto] = useState(false);
  const [ftb, setFtb] = useState(false);

  const p = Math.max(0, Number(price.replace(/[^0-9.]/g, "")) || 0);
  const r = calcLtt(p, { inToronto, firstTimeBuyer: ftb });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Purchase price (CAD)" htmlFor="ltt-price">
          <Input
            id="ltt-price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
          <Checkbox checked={inToronto} onChange={(e) => setInToronto(e.target.checked)} />
          Property is in the City of Toronto
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
          <Checkbox checked={ftb} onChange={(e) => setFtb(e.target.checked)} />
          First-time home buyer
        </label>
      </div>

      <dl className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Ontario land transfer tax</dt>
          <dd className="font-medium text-ink">{money(r.ontario)}</dd>
        </div>
        {inToronto ? (
          <div className="flex justify-between">
            <dt className="text-slate-600">Toronto municipal land transfer tax</dt>
            <dd className="font-medium text-ink">{money(r.toronto)}</dd>
          </div>
        ) : null}
        {ftb ? (
          <>
            <div className="flex justify-between">
              <dt className="text-slate-600">Ontario first-time-buyer rebate</dt>
              <dd className="font-medium text-emerald-700">−{money(r.ontarioRebate)}</dd>
            </div>
            {inToronto ? (
              <div className="flex justify-between">
                <dt className="text-slate-600">Toronto first-time-buyer rebate</dt>
                <dd className="font-medium text-emerald-700">−{money(r.torontoRebate)}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
          <dt className="font-semibold text-ink">Total land transfer tax</dt>
          <dd className="font-semibold text-ink">{money(r.net)}</dd>
        </div>
      </dl>
    </div>
  );
}
