import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TITLE_LABELS, type RealtorCard, type RealtorTitle } from "@/lib/types";

export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Z0-9]{4,16}$/;

/**
 * "Every link you share is yours" — the visible half. Resolves a referral
 * code (the 30-day `liqwd_ref` cookie the proxy sets) to the sharing agent's
 * PUBLIC card so the consumer site can show who the buyer is browsing with.
 * Reads only `public_realtor_cards` (opted-in + verified agents; public-safe
 * columns), so nothing here is more exposed than the agent's own page.
 * Client-fetched rather than read in the layout so static public pages
 * (tools, terms) stay static.
 */
export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().toUpperCase();
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ agent: null }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("public_realtor_cards")
    .select("*")
    .eq("referral_code", code)
    .maybeSingle();
  const card = (data as RealtorCard | null) ?? null;

  const headers = { "Cache-Control": "public, max-age=300, s-maxage=300" };
  if (!card) return NextResponse.json({ agent: null }, { headers });

  const title = card.title as RealtorTitle | null;
  return NextResponse.json(
    {
      agent: {
        first_name: card.first_name,
        last_name: card.last_name,
        title_label: title ? (TITLE_LABELS[title] ?? null) : null,
        brokerage: card.brokerage,
        phone: card.phone,
        email: card.email,
        slug: card.slug,
        avatar_url: card.avatar_url,
      },
    },
    { headers },
  );
}
