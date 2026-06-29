import { Field, Input, Textarea, Select, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ListingImagesUploader } from "@/components/dashboard/off-market/images-uploader";
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  PRICE_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  SIZE_TYPE_LABELS,
  TITLE_LABELS,
  type OffMarketListing,
  type PriceType,
  type ListingStatus,
  type SizeType,
  type Profile,
} from "@/lib/types";

const PRICE_TYPE_ORDER: PriceType[] = [
  "flat_price",
  "price_per_sqft",
  "price_per_acre",
  "price_per_unit",
];
const LISTING_STATUS_ORDER: ListingStatus[] = [
  "for_sale",
  "for_lease",
  "for_sale_and_lease",
];
const SIZE_TYPE_ORDER: SizeType[] = ["square_footage", "acreage", "unit_count"];

/**
 * Shared create/edit form for an off-market listing. Server component: renders a
 * plain <form action={...}> and nests the client-side image uploader. Contact
 * fields are prefilled from the realtor's profile (a snapshot is stored on the
 * listing) but remain editable per-listing.
 */
export function ListingForm({
  action,
  listing,
  profile,
  userId,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  listing: OffMarketListing | null;
  profile: Profile;
  userId: string;
  submitLabel: string;
}) {
  const contactName =
    listing?.realtor_name ??
    ([profile.first_name, profile.last_name].filter(Boolean).join(" ") || "");
  const contactTitle =
    listing?.realtor_title ??
    (profile.title ? TITLE_LABELS[profile.title] : "");
  const brokerage = listing?.brokerage_name ?? profile.brokerage_name ?? "";
  const phone = listing?.contact_phone ?? profile.phone ?? "";
  const email = listing?.contact_email ?? profile.email ?? "";
  const selectedTypes = new Set(listing?.property_types ?? []);

  return (
    <form action={action} className="space-y-8">
      {listing ? <input type="hidden" name="id" value={listing.id} /> : null}

      {/* Listing details */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Listing details
        </h2>
        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            defaultValue={listing?.title ?? ""}
            placeholder="e.g. Off-market 4-plex, fully tenanted"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price" htmlFor="price">
            <Input
              id="price"
              name="price"
              required
              inputMode="decimal"
              defaultValue={listing ? String(listing.price) : ""}
              placeholder="1250000"
            />
          </Field>
          <Field label="Price basis" htmlFor="price_type">
            <Select
              id="price_type"
              name="price_type"
              defaultValue={listing?.price_type ?? "flat_price"}
            >
              {PRICE_TYPE_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRICE_TYPE_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Status" htmlFor="listing_status">
          <Select
            id="listing_status"
            name="listing_status"
            defaultValue={listing?.listing_status ?? "for_sale"}
          >
            {LISTING_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {LISTING_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="space-y-1.5">
          <Label>Property type(s)</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROPERTY_TYPES.map((pt) => (
              <label
                key={pt}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  name="property_types"
                  value={pt}
                  defaultChecked={selectedTypes.has(pt)}
                  className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {PROPERTY_TYPE_LABELS[pt]}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">Select all that apply.</p>
        </div>

        <Field
          label="Property description"
          htmlFor="property_type_description"
          hint="Optional. A subcategory or extra detail (e.g. “corner lot, R3 zoning”)."
        >
          <Textarea
            id="property_type_description"
            name="property_type_description"
            defaultValue={listing?.property_type_description ?? ""}
          />
        </Field>
      </section>

      {/* Location */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Location
        </h2>
        <Field
          label="City / region"
          htmlFor="city_region"
          hint="Required. As specific or broad as you like — “King City, ON” or “GTA West”."
        >
          <Input
            id="city_region"
            name="city_region"
            required
            defaultValue={listing?.city_region ?? ""}
          />
        </Field>
        <Field
          label="Address"
          htmlFor="address"
          hint="Optional. Leave blank to keep an off-market deal discreet."
        >
          <Input
            id="address"
            name="address"
            defaultValue={listing?.address ?? ""}
          />
        </Field>
      </section>

      {/* Size */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Size <span className="font-normal normal-case text-slate-400">(optional)</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Size" htmlFor="size_value">
            <Input
              id="size_value"
              name="size_value"
              inputMode="decimal"
              defaultValue={listing?.size_value != null ? String(listing.size_value) : ""}
              placeholder="e.g. 2400"
            />
          </Field>
          <Field label="Unit" htmlFor="size_type">
            <Select
              id="size_type"
              name="size_type"
              defaultValue={listing?.size_type ?? ""}
            >
              <option value="">—</option>
              {SIZE_TYPE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {SIZE_TYPE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      {/* Photos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Photos <span className="font-normal normal-case text-slate-400">(optional)</span>
        </h2>
        <ListingImagesUploader
          userId={userId}
          initialUrls={listing?.image_urls ?? []}
        />
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your contact info
        </h2>
        <p className="-mt-2 text-xs text-slate-500">
          Shown to other agents on the board so they can reach you about this
          deal. Prefilled from your profile — edit if needed.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="realtor_name">
            <Input
              id="realtor_name"
              name="realtor_name"
              required
              defaultValue={contactName}
            />
          </Field>
          <Field label="Title" htmlFor="realtor_title">
            <Input
              id="realtor_title"
              name="realtor_title"
              defaultValue={contactTitle}
              placeholder="Sales Representative"
            />
          </Field>
          <Field label="Brokerage" htmlFor="brokerage_name">
            <Input
              id="brokerage_name"
              name="brokerage_name"
              required
              defaultValue={brokerage}
            />
          </Field>
          <Field label="Phone" htmlFor="contact_phone">
            <Input
              id="contact_phone"
              name="contact_phone"
              required
              type="tel"
              defaultValue={phone}
            />
          </Field>
          <Field label="Email" htmlFor="contact_email">
            <Input
              id="contact_email"
              name="contact_email"
              required
              type="email"
              defaultValue={email}
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
