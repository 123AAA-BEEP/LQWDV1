import { Field, Input, Textarea, Select, Label } from "@/components/ui/field";
import {
  DEAL_TYPE_LABELS,
  PRICE_BASIS_LABELS,
  HIDEABLE_FIELDS,
} from "@/lib/opportunities";
import type { Opportunity } from "@/lib/types";

/**
 * Shared field set for creating/editing an opportunity. Defaults come from an
 * existing row when editing. The privacy checklist drives `hidden_fields`,
 * which the market views use to mask anything the developer keeps private.
 */
export function OpportunityFields({ value }: { value?: Opportunity }) {
  const v = value;
  const dealType = v?.deal_type ?? "single_property";
  const priceBasis = v?.price_basis ?? "total";
  const hidden = new Set(v?.hidden_fields ?? ["address"]);

  return (
    <div className="space-y-5">
      <Field label="Deal title" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          defaultValue={v?.title ?? ""}
          placeholder="e.g. 5 townhome assignments — west end"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deal type" htmlFor="deal_type">
          <Select id="deal_type" name="deal_type" defaultValue={dealType}>
            {Object.entries(DEAL_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Number of units / properties"
          htmlFor="unit_count"
          hint="e.g. 1 unit (#510), or 5 properties"
        >
          <Input
            id="unit_count"
            name="unit_count"
            type="number"
            min="0"
            defaultValue={v?.unit_count ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Summary"
        htmlFor="summary"
        hint="What realtors see in the marketplace. Keep out anything you mark hidden below."
      >
        <Textarea
          id="summary"
          name="summary"
          defaultValue={v?.summary ?? ""}
          placeholder="Describe the opportunity for realtors…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={v?.city ?? ""} />
        </Field>
        <Field label="Province" htmlFor="province">
          <Input
            id="province"
            name="province"
            defaultValue={v?.province ?? "Ontario"}
          />
        </Field>
      </div>

      <Field
        label="Property address"
        htmlFor="address_full"
        hint="Hide this below if you’re protecting appraisal values before closing."
      >
        <Input
          id="address_full"
          name="address_full"
          defaultValue={v?.address_full ?? ""}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Asking price" htmlFor="asking_price">
          <Input
            id="asking_price"
            name="asking_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={v?.asking_price ?? ""}
          />
        </Field>
        <Field label="Price basis" htmlFor="price_basis">
          <Select id="price_basis" name="price_basis" defaultValue={priceBasis}>
            {Object.entries(PRICE_BASIS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Commission (%)" htmlFor="commission_percent">
          <Input
            id="commission_percent"
            name="commission_percent"
            type="number"
            min="0"
            step="0.01"
            defaultValue={v?.commission_percent ?? ""}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Incentive amount" htmlFor="incentive_amount">
          <Input
            id="incentive_amount"
            name="incentive_amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={v?.incentive_amount ?? ""}
          />
        </Field>
        <Field label="Incentive notes" htmlFor="incentive_notes">
          <Input
            id="incentive_notes"
            name="incentive_notes"
            defaultValue={v?.incentive_notes ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Internal notes (never shown to realtors)"
        htmlFor="internal_notes"
        hint="Private to you and LIQWD admins."
      >
        <Textarea
          id="internal_notes"
          name="internal_notes"
          defaultValue={v?.internal_notes ?? ""}
        />
      </Field>

      <fieldset className="space-y-2 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">
          Hide from realtors
        </legend>
        <p className="text-xs text-slate-500">
          Anything you check here is masked in the marketplace and shown as
          “Hidden by developer”. Internal notes are always private.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {HIDEABLE_FIELDS.map((f) => (
            <label
              key={f.key}
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name="hidden_fields"
                value={f.key}
                defaultChecked={hidden.has(f.key)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function HiddenFieldsLegend() {
  return (
    <Label className="text-slate-500">
      Tip: hide the address and price to keep appraisal comparables private until
      closing.
    </Label>
  );
}
