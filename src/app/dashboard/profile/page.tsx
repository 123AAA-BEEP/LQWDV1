import type { Metadata } from "next";
import { requireUserProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { VERIFICATION_LABELS, TITLE_LABELS } from "@/lib/types";
import { updateProfile } from "./actions";

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
      {error ? <Notice tone="error">{error}</Notice> : null}

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
    </div>
  );
}
