import Link from "next/link";
import { ExternalLink, Share2, Zap } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { ProBadge } from "@/components/dashboard/tier-ui";
import { CopyLinkButton } from "@/app/dashboard/lead-pages/copy-link-button";

/**
 * "Share with clients" on the broker project view. Pro members get this
 * project's personal referral link (every enquiry from it is attributed to
 * them); free members see a Pro upsell. The link reuses the same `?ref=<code>`
 * attribution the Lead Pages feature already runs on — sharing here and managing
 * the full set in Lead Pages are two doors to the same mechanism.
 */
export function ShareWithClients({
  proAccess,
  hasCode,
  refUrl,
  pageUrl,
}: {
  proAccess: boolean;
  hasCode: boolean;
  refUrl: string;
  pageUrl: string;
}) {
  return (
    <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-white">
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
            <Share2 className="size-4 text-brand-600" aria-hidden />
            Share with clients
          </h2>
          <ProBadge />
        </div>

        {proAccess ? (
          hasCode ? (
            <>
              <p className="text-sm text-slate-600">
                Your personal referral link for this project. Send it to a buyer
                and every enquiry it captures is attributed to you.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <code
                  className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                  title={refUrl}
                >
                  {refUrl}
                </code>
                <CopyLinkButton url={refUrl} label="Copy link" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  Preview the page
                </a>
                <Link
                  href="/dashboard/lead-pages"
                  className="font-medium text-slate-500 hover:underline"
                >
                  Manage everything you&apos;re sharing →
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Your personal referral link is being generated — refresh in a
              moment and you&apos;ll be able to share this project and collect
              its leads.
            </p>
          )
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Turn this project into your own referral link. With Pro you can
              share any project with buyers and collect every lead it brings
              back — automatically attributed to you.
            </p>
            <ButtonLink href="/dashboard/upgrade" size="sm">
              <Zap className="size-4" aria-hidden />
              Upgrade to Pro
            </ButtonLink>
          </>
        )}
      </CardBody>
    </Card>
  );
}
