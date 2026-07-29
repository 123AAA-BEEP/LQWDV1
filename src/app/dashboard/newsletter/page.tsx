import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { FlashNotice } from "@/components/ui/flash-notice";
import { sendNewsletter } from "./actions";

export const metadata: Metadata = { title: "Newsletter" };
export const dynamic = "force-dynamic";

interface ArticleRow {
  id: string;
  slug: string;
  article_type: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
}
interface SendRow {
  id: string;
  created_at: string;
  subject: string;
  recipient_count: number;
  skipped_count: number;
}

const first = (v: unknown): string =>
  Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { profile } = await requireUserProfile();
  const supabase = await createClient();

  const [{ data: articleData }, { count: consentedCount }, { data: sendData }] =
    await Promise.all([
      supabase
        .from("public_articles_view")
        .select("id, slug, article_type, title, excerpt, published_at")
        .order("published_at", { ascending: false })
        .limit(20),
      supabase
        .from("crm_contacts")
        .select("id", { count: "exact", head: true })
        .eq("agent_profile_id", profile.id)
        .eq("archived", false)
        .eq("consent_email", true)
        .is("unsubscribed_at", null)
        .not("email", "is", null),
      supabase
        .from("crm_newsletter_sends")
        .select("id, created_at, subject, recipient_count, skipped_count")
        .eq("agent_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
  const articles = (articleData as ArticleRow[] | null) ?? [];
  const consented = consentedCount ?? 0;
  const sends = (sendData as SendRow[] | null) ?? [];
  const agentName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "you";

  return (
    <div className="space-y-6">
      <FlashNotice
        searchParams={{ flash: first(sp.flash), flash_tone: first(sp.flash_tone) }}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Your newsletter
        </h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Pick a few of this week&apos;s articles, add a personal line, and
          send a co-branded email to your consented contacts. Replies come
          straight to you, and anyone who clicks through and inquires becomes
          your attributed lead.
        </p>
      </div>

      {!isApproved(profile) ? (
        <Notice tone="warning">
          Sending needs an active verification —{" "}
          <Link href="/dashboard/verify" className="underline">
            verify your licence
          </Link>{" "}
          first.
        </Notice>
      ) : consented === 0 ? (
        <Notice tone="info">
          You have no consented contacts yet. Add contacts in{" "}
          <Link href="/dashboard/crm" className="underline">
            Clients
          </Link>{" "}
          and tick the email-consent attestation — that&apos;s your send list.
        </Notice>
      ) : (
        <Notice tone="success">
          Ready to send to {consented} consented contact
          {consented === 1 ? "" : "s"}.
        </Notice>
      )}

      <Card>
        <CardBody>
          <form action={sendNewsletter} className="space-y-4">
            <Field label="Subject line" htmlFor="n_subject">
              <Input
                id="n_subject"
                name="subject"
                required
                maxLength={150}
                defaultValue="This week in new construction"
              />
            </Field>
            <Field
              label="Your intro (optional)"
              htmlFor="n_intro"
              hint="One or two personal lines — this is what makes it yours."
            >
              <Textarea
                id="n_intro"
                name="intro"
                className="min-h-16"
                maxLength={1500}
                placeholder={`e.g. Hi — a few things worth knowing this week if you're watching the market. — ${agentName}`}
              />
            </Field>

            <div>
              <p className="text-sm font-medium text-slate-700">
                Pick 1–7 articles
              </p>
              {articles.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No published articles yet — the daily pipeline is filling
                  the shelf.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {articles.map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <Checkbox name="article_id" value={a.id} className="mt-0.5" />
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-800">
                          {a.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">
                          {a.excerpt ?? ""}
                        </span>
                        <Link
                          href={`/insights/${a.slug}`}
                          target="_blank"
                          className="mt-0.5 inline-block text-xs text-brand-700 hover:underline"
                        >
                          Preview →
                        </Link>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={!isApproved(profile) || consented === 0 || articles.length === 0}
              >
                Send to {consented} contact{consented === 1 ? "" : "s"}
              </Button>
              <p className="text-xs text-slate-400">
                One send per 24h. Every email carries your name
                {profile.brokerage_name ? ` and ${profile.brokerage_name}` : ""},
                a working unsubscribe, and the CASL sender block.
              </p>
            </div>
          </form>
        </CardBody>
      </Card>

      {sends.length > 0 ? (
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-ink">Send history</h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {sends.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">{s.subject}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(s.created_at).toLocaleString("en-CA")}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums text-slate-600">
                    {s.recipient_count} sent
                    {s.skipped_count ? ` · ${s.skipped_count} skipped` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
