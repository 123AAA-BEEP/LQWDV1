import type { Metadata } from "next";
import { requireUserProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { VERIFICATION_LABELS, TITLE_LABELS } from "@/lib/types";
import { updateProfile, changeEmail } from "./actions";
import { uploadAvatar, uploadLogo } from "./upload-actions";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { profile, email } = await requireUserProfile();

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
              title="Profile photo"
              currentUrl={profile.avatar_url}
              action={uploadAvatar}
              accept="image/png,image/jpeg,image/webp"
              fallback="No photo yet"
              rounded
            />
            <UploadTile
              title="Brokerage logo"
              currentUrl={profile.logo_url}
              action={uploadLogo}
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

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                name="is_public_profile_enabled"
                defaultChecked={profile.is_public_profile_enabled}
                className="mt-0.5 size-4"
              />
              <span className="text-sm text-slate-600">
                Show my realtor card on public project pages (name, title, and
                brokerage only). Visible once you are verified.
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

function UploadTile({
  title,
  currentUrl,
  action,
  accept,
  fallback,
  rounded,
}: {
  title: string;
  currentUrl: string | null;
  action: (formData: FormData) => void;
  accept: string;
  fallback: string;
  rounded?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div
        className={`flex size-20 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 ${
          rounded ? "rounded-full" : "rounded-lg"
        }`}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-2 text-center text-[10px] text-slate-400">
            {fallback}
          </span>
        )}
      </div>
      <form action={action} className="flex-1 space-y-2">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <input
          type="file"
          name="file"
          accept={accept}
          required
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <SubmitButton size="sm" variant="secondary" pendingLabel="Uploading…">
          {currentUrl ? "Replace" : "Upload"}
        </SubmitButton>
      </form>
    </div>
  );
}
