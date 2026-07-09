"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { DEPOSIT_PRESETS, money } from "@/lib/calculators";

/** Interactive pre-construction deposit-schedule calculator. */
export function DepositCalculator() {
  const [price, setPrice] = useState<string>("750000");
  const [preset, setPreset] = useState<string>(DEPOSIT_PRESETS[0].key);

  const p = Math.max(0, Number(price.replace(/[^0-9.]/g, "")) || 0);
  const structure =
    DEPOSIT_PRESETS.find((s) => s.key === preset) ?? DEPOSIT_PRESETS[0];
  const totalPct = structure.stages.reduce((s, st) => s + st.pct, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Purchase price (CAD)" htmlFor="dep-price">
          <Input
            id="dep-price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="Deposit structure" htmlFor="dep-preset">
          <Select id="dep-preset" value={preset} onChange={(e) => setPreset(e.target.value)}>
            {DEPOSIT_PRESETS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <table className="mt-6 w-full border-t border-slate-100 text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 font-medium">Stage</th>
            <th className="py-2 text-right font-medium">%</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {structure.stages.map((s, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-2 text-slate-700">{s.label}</td>
              <td className="py-2 text-right text-slate-600">{s.pct}%</td>
              <td className="py-2 text-right font-medium text-ink">
                {money((p * s.pct) / 100)}
              </td>
            </tr>
          ))}
          <tr className="border-t border-slate-200 text-base">
            <td className="py-2 font-semibold text-ink">Total deposit</td>
            <td className="py-2 text-right font-semibold text-ink">{totalPct}%</td>
            <td className="py-2 text-right font-semibold text-ink">
              {money((p * totalPct) / 100)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-500">
        Every builder sets its own schedule — dates and amounts here reflect
        common GTA structures, not any specific project&apos;s terms.
      </p>
    </div>
  );
}
