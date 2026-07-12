import type { Metadata } from "next";
import { requireUserProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { VERIFICATION_LABELS, TITLE_LABELS } from "@/lib/types";
import { updateProfile, changeEmail } from "./actions";
import { UploadTile } from "./upload-tile";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { profile, email, userId } = await requireUserProfile();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Profile &amp; settings
        </h1>
        <Badge tone={verificationBadgeTone(profile.verification_status)}>
          {VERIFICATION_LABELS[profile.verification_status]}
        </Badge>
      </div>

      {message === "saved" ? (
        <Notice tone="success">Your changes have been saved.</Notice>
      ) : null}
      {message === "avatar-updated" ? (
        <Notice tone="success">Your photo has been updated.</Notice>
      ) : null}
      {message === "logo-updated" ? (
        <Notice tone="success">Your logo has been updated.</Notice>
      ) : null}
      {message === "email-change-pending" ? (
        <Notice tone="info">
          A confirmation link has been sent to your new email address. Click it
          to complete the change. Your email won&apos;t update until you confirm.
        </Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* Photo & logo uploads (public buckets) */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Photo &amp; logo</h2>
            <Badge tone="neutral">Public</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Used on your account and, where enabled, your public realtor card.
            PNG, JPG, or WebP up to 5&nbsp;MB.
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <UploadTile
              kind="avatar"
              title="Profile photo"
              currentUrl={profile.avatar_url}
              userId={userId}
              accept="image/png,image/jpeg,image/webp"
              fallback="No photo yet"
              rounded
            />
            <UploadTile
              kind="logo"
              title="Brokerage logo"
              currentUrl={profile.logo_url}
              userId={userId}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              fallback="No logo yet"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <form action={updateProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="first_name">
                <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={profile.first_name ?? ""}
                />
              </Field>
              <Field label="Last name" htmlFor="last_name">
                <Input
                  id="last_name"
                  name="last_name"
                  defaultValue={profile.last_name ?? ""}
                />
              </Field>
            </div>

            <Field label="Email" htmlFor="email" hint="Contact support to change your email.">
              <Input id="email" defaultValue={email ?? ""} disabled />
            </Field>

            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
            </Field>

            <Field label="Brokerage" htmlFor="brokerage_name">
              <Input
                id="brokerage_name"
                name="brokerage_name"
                defaultValue={profile.brokerage_name ?? ""}
              />
            </Field>

            <Field label="Title" htmlFor="title">
              <Select id="title" name="title" defaultValue={profile.title ?? ""}>
                <option value="">Not specified</option>
                {Object.entries(TITLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Short bio"
              htmlFor="bio_short"
              hint="Shown on your public agent page. 2–3 sentences about how you work and what you specialize in."
            >
              <Textarea
                id="bio_short"
                name="bio_short"
                rows={3}
                maxLength={600}
                defaultValue={profile.bio_short ?? ""}
              />
            </Field>

            <Field
              label="Service area"
              htmlFor="service_area"
              hint='Cities you work, e.g. "Mississauga, Oakville, Burlington" — also used to curate your public page.'
            >
              <Input
                id="service_area"
                name="service_area"
                maxLength={200}
                defaultValue={profile.service_area ?? ""}
              />
            </Field>

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                name="is_public_profile_enabled"
                defaultChecked={profile.is_public_profile_enabled}
                className="mt-0.5 size-4"
              />
              <span className="text-sm text-slate-600">
                Show my public agent page and realtor card (name, title,
                brokerage, photo, and bio). Visible once you are verified.
              </span>
            </label>

            <Button type="submit">Save changes</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink">Change email address</h2>
          <p className="mt-1 text-sm text-slate-500">
            Current: <span className="font-medium text-slate-700">{email}</span>
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            A confirmation link will be sent to the new address. Your email
            won&apos;t change until you click it.
          </p>
          <form action={changeEmail} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <Field label="New email address" htmlFor="new_email">
                <Input
                  id="new_email"
                  name="new_email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
            </div>
            <SubmitButton variant="secondary" pendingLabel="Sending…">
              Send confirmation
            </SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
