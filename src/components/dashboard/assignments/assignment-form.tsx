import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import {
  BUILDER_CONSENT_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentListing,
} from "@/lib/types";

/**
 * Post / edit an assignment. Server-rendered form posting to a server action.
 * The rights attestation + compliance note are load-bearing: LIQWD is a
 * matchmaking board, never a party to the assignment.
 */
export function AssignmentForm({
  action,
  listing,
  defaults,
  error,
}: {
  action: (formData: FormData) => void;
  /** Present when editing. */
  listing?: AssignmentListing;
  /** Contact prefill from the poster's profile (create only). */
  defaults: {
    realtor_name: string;
    brokerage_name: string;
    contact_phone: string;
    contact_email: string;
  };
  error?: string;
}) {
  const v = <K extends keyof AssignmentListing>(k: K) =>
    listing?.[k] ?? undefined;
  const money = (n: number | null | undefined) =>
    n === null || n === undefined ? "" : String(n);

  return (
    <form action={action} className="space-y-6">
      {listing ? <input type="hidden" name="id" value={listing.id} /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* The unit */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          The unit
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project name" htmlFor="project_name">
            <Input
              id="project_name"
              name="project_name"
              required
              defaultValue={(v("project_name") as string) ?? ""}
              placeholder="e.g. The Summit at Downsview"
            />
          </Field>
          <Field label="City / region" htmlFor="city_region">
            <Input
              id="city_region"
              name="city_region"
              required
              defaultValue={(v("city_region") as string) ?? ""}
              placeholder="e.g. North York, ON"
            />
          </Field>
          <Field label="Unit / suite" htmlFor="unit_label">
            <Input
              id="unit_label"
              name="unit_label"
              defaultValue={(v("unit_label") as string) ?? ""}
              placeholder="e.g. Unit 1203"
            />
          </Field>
          <Field label="Exposure" htmlFor="exposure">
            <Input
              id="exposure"
              name="exposure"
              defaultValue={(v("exposure") as string) ?? ""}
              placeholder="e.g. SW corner"
            />
          </Field>
          <Field label="Beds" htmlFor="beds">
            <Input id="beds" name="beds" defaultValue={money(v("beds") as number)} placeholder="e.g. 2" />
          </Field>
          <Field label="Baths" htmlFor="baths">
            <Input id="baths" name="baths" defaultValue={money(v("baths") as number)} placeholder="e.g. 2" />
          </Field>
          <Field label="Interior sq ft" htmlFor="size_sqft">
            <Input id="size_sqft" name="size_sqft" defaultValue={money(v("size_sqft") as number)} placeholder="e.g. 850" />
          </Field>
          <Field label="Parking" htmlFor="parking">
            <Input id="parking" name="parking" defaultValue={money(v("parking") as number)} placeholder="e.g. 1" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="locker"
            defaultChecked={Boolean(v("locker"))}
          />
          Locker included
        </label>
      </fieldset>

      {/* Economics */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          The deal
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assignment price (the ask)" htmlFor="assignment_price">
            <Input
              id="assignment_price"
              name="assignment_price"
              required
              defaultValue={money(v("assignment_price") as number)}
              placeholder="e.g. 780000"
            />
          </Field>
          <Field label="Original purchase price (optional)" htmlFor="original_purchase_price">
            <Input
              id="original_purchase_price"
              name="original_purchase_price"
              defaultValue={money(v("original_purchase_price") as number)}
              placeholder="e.g. 690000"
            />
          </Field>
          <Field label="Deposit paid to date (optional)" htmlFor="deposit_paid_to_date">
            <Input
              id="deposit_paid_to_date"
              name="deposit_paid_to_date"
              defaultValue={money(v("deposit_paid_to_date") as number)}
              placeholder="e.g. 138000"
            />
          </Field>
          <Field label="Co-op commission note (optional)" htmlFor="co_op_commission_note">
            <Input
              id="co_op_commission_note"
              name="co_op_commission_note"
              defaultValue={(v("co_op_commission_note") as string) ?? ""}
              placeholder="e.g. 2.5% to co-operating brokerage"
            />
          </Field>
          <Field label="Interim occupancy (optional)" htmlFor="occupancy_estimate">
            <Input
              id="occupancy_estimate"
              name="occupancy_estimate"
              defaultValue={(v("occupancy_estimate") as string) ?? ""}
              placeholder="e.g. Q3 2026"
            />
          </Field>
          <Field label="Final closing (optional)" htmlFor="final_closing_estimate">
            <Input
              id="final_closing_estimate"
              name="final_closing_estimate"
              defaultValue={(v("final_closing_estimate") as string) ?? ""}
              placeholder="e.g. 2028"
            />
          </Field>
        </div>
      </fieldset>

      {/* Builder consent + lifecycle */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Builder consent &amp; status
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Builder consent status" htmlFor="builder_consent_status">
            <Select
              id="builder_consent_status"
              name="builder_consent_status"
              defaultValue={(v("builder_consent_status") as string) ?? "unknown"}
            >
              {Object.entries(BUILDER_CONSENT_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Builder assignment fee (optional)" htmlFor="builder_assignment_fee">
            <Input
              id="builder_assignment_fee"
              name="builder_assignment_fee"
              defaultValue={money(v("builder_assignment_fee") as number)}
              placeholder="e.g. 7500"
            />
          </Field>
          <Field label="Listing status" htmlFor="status">
            <Select
              id="status"
              name="status"
              defaultValue={(v("status") as string) ?? "active"}
            >
              {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes for other agents (optional)" htmlFor="notes">
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={(v("notes") as string) ?? ""}
            placeholder="e.g. Motivated assignor, flexible on closing. Floor plans available on request."
          />
        </Field>
      </fieldset>

      {/* Contact snapshot */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your contact (shown to other verified agents)
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="realtor_name">
            <Input
              id="realtor_name"
              name="realtor_name"
              required
              defaultValue={(v("realtor_name") as string) ?? defaults.realtor_name}
            />
          </Field>
          <Field label="Brokerage" htmlFor="brokerage_name">
            <Input
              id="brokerage_name"
              name="brokerage_name"
              required
              defaultValue={(v("brokerage_name") as string) ?? defaults.brokerage_name}
            />
          </Field>
          <Field label="Phone" htmlFor="contact_phone">
            <Input
              id="contact_phone"
              name="contact_phone"
              required
              defaultValue={(v("contact_phone") as string) ?? defaults.contact_phone}
            />
          </Field>
          <Field label="Email" htmlFor="contact_email">
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              required
              defaultValue={(v("contact_email") as string) ?? defaults.contact_email}
            />
          </Field>
        </div>
      </fieldset>

      {/* Attestation — load-bearing */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            name="rights_confirmed"
            required
            className="mt-0.5"
            defaultChecked={Boolean(listing?.rights_confirmed_at)}
          />
          <span>
            I have the right to market this assignment, I will obtain the
            builder&apos;s consent as required by the purchase agreement, and I
            understand LIQWD is not a party to the assignment and does not verify
            these details.
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel={listing ? "Saving…" : "Posting…"}>
          {listing ? "Save changes" : "Post assignment"}
        </SubmitButton>
        <Link href="/dashboard/assignments" className="text-sm text-slate-500 hover:underline">
          Cancel
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        This board is visible only to verified LIQWD agents. Prices, deposits,
        incentives, and consent status are provided by the posting agent and not
        verified by LIQWD. Assignment taxation (including HST) and builder
        consent are the responsibility of the parties and their advisors.
      </p>
    </form>
  );
}
