import Link from "next/link";
import { ExternalLink, Share2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { CopyLinkButton } from "@/app/dashboard/lead-pages/copy-link-button";

/**
 * "Share with clients" on the broker project view — two doors to the same
 * public page:
 *
 * 1. The GENERIC public link (the default share): the page itself, with its
 *    floor plans and public brochures — no agent branding, safe to post
 *    anywhere.
 * 2. The agent's PERSONAL referral link (`?ref=<code>`, same attribution
 *    mechanism Lead Pages runs on): every enquiry it captures is attributed
 *    to them. Free for all verified agents — each shared link is our
 *    marketing, done by the agent for their own pipeline.
 */
export function ShareWithClients({
  hasCode,
  refUrl,
  pageUrl,
}: {
  hasCode: boolean;
  refUrl: string;
  pageUrl: string;
}) {
  return (
    <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-white">
      <CardBody className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
          <Share2 className="size-4 text-brand-600" aria-hidden />
          Share this project
        </h2>

        <div className="space-y-1.5">
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">Public link</span> —
            the page as anyone sees it, floor plans and brochures included. No
            agent branding; share it anywhere.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code
              className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
              title={pageUrl}
            >
              {pageUrl}
            </code>
            <CopyLinkButton url={pageUrl} label="Copy link" />
          </div>
        </div>

        {hasCode ? (
          <div className="space-y-1.5 border-t border-brand-100 pt-3">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">
                Your branded link
              </span>{" "}
              — same page, but every enquiry it captures is attributed to you.
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
          </div>
        ) : (
          <p className="border-t border-brand-100 pt-3 text-sm text-slate-500">
            Your personal referral link is being generated — refresh in a
            moment to also share a version that attributes its leads to you.
          </p>
        )}

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
      </CardBody>
    </Card>
  );
}
