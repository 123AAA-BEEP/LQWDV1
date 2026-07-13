import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { REGIONS, REGION_KEYS, type RegionKey } from "@/lib/regions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The embeddable "Verified on LIQWD" badge — a LIVE, revocable credential.
 *
 * Row-presence in public_realtor_cards IS the verification predicate (the view
 * only contains approved + public agents), so suspension, rejection, or the
 * agent hiding their card automatically flips this to the gray tombstone
 * within the CDN window. The agent's NAME is baked into the pixels — a
 * nameless generic mark would be trivially reusable by anyone; a named one
 * makes misuse plain impersonation.
 *
 * Compliance (TRESA-aware): the eyebrow names the actual regulator whose
 * registration we verified ("RECO REGISTRATION VERIFIED"), never implying the
 * regulator endorses the agent or LIQWD; brokerage is always rendered.
 *
 *   GET /api/badge/{slug}[.png]?size=email|deck|square   (default: email)
 *
 * Rendered at 2x for retina; embed with width/height attrs to downscale.
 * Cached at the CDN for an hour — the badge's revocation SLA.
 */

const SIZES = {
  email: { width: 560, height: 140 },   // display 280x70 — signature-safe
  deck: { width: 1200, height: 300 },   // slide/website corner
  square: { width: 1080, height: 1080 }, // Instagram download (static there)
} as const;
type SizeKey = keyof typeof SIZES;

interface CardRow {
  first_name: string | null;
  last_name: string | null;
  brokerage: string | null;
  reco_verified_at: string | null;
  license_region: string | null;
}

function regulatorLine(region: string | null): string {
  const key = (REGION_KEYS as readonly string[]).includes(region ?? "")
    ? (region as RegionKey)
    : null;
  return key
    ? `${REGIONS[key].regulator.shortName} REGISTRATION VERIFIED`
    : "LICENCE VERIFIED";
}

const CACHE_LIVE =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.replace(/\.png$/i, "");
  const url = new URL(req.url);
  const sizeKey: SizeKey = (["email", "deck", "square"] as const).includes(
    url.searchParams.get("size") as SizeKey,
  )
    ? (url.searchParams.get("size") as SizeKey)
    : "email";
  const { width, height } = SIZES[sizeKey];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await supabase
    .from("public_realtor_cards")
    .select("first_name, last_name, brokerage, reco_verified_at, license_region")
    .eq("slug", slug)
    .maybeSingle();
  const card = (data as CardRow) ?? null;

  // Not (or no longer) verified+public: the gray tombstone. Uncached so
  // reinstatement is instant, and unambiguous so it can't be screenshotted
  // as an endorsement.
  if (!card) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#e2e8f0",
            color: "#64748b",
            fontFamily: "sans-serif",
            gap: 8,
          }}
        >
          <div style={{ fontSize: height / 6, fontWeight: 600, display: "flex" }}>
            Not currently verified
          </div>
          <div style={{ fontSize: height / 9, display: "flex" }}>LIQWD</div>
        </div>
      ),
      {
        width,
        height,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const name =
    [card.first_name, card.last_name].filter(Boolean).join(" ") || "LIQWD Agent";
  const eyebrow = regulatorLine(card.license_region);
  const since = card.reco_verified_at
    ? `Verified by LIQWD since ${new Date(card.reco_verified_at).getFullYear()}`
    : "Verified by LIQWD";
  const square = sizeKey === "square";

  // Scale typography off the badge height so all variants stay proportional.
  const u = square ? height / 10 : height;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: square ? "column" : "row",
          alignItems: "center",
          justifyContent: square ? "center" : "flex-start",
          background: "#0b1220",
          fontFamily: "sans-serif",
          padding: square ? 80 : `0 ${height * 0.22}px`,
          gap: square ? 36 : height * 0.18,
          textAlign: square ? ("center" as const) : ("left" as const),
        }}
      >
        {/* Check seal */}
        <div
          style={{
            width: square ? 220 : height * 0.56,
            height: square ? 220 : height * 0.56,
            borderRadius: 999,
            background: "#065f46",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width={square ? 130 : height * 0.34}
            height={square ? 130 : height * 0.34}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6ee7b7"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: square ? "center" : "flex-start",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: square ? 40 : u * 0.15,
              fontWeight: 700,
              letterSpacing: "2px",
              color: "#6ee7b7",
              display: "flex",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              marginTop: square ? 18 : u * 0.03,
              fontSize: square ? 88 : u * 0.26,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-1px",
              display: "flex",
            }}
          >
            {name}
          </div>
          {card.brokerage ? (
            <div
              style={{
                marginTop: square ? 14 : u * 0.02,
                fontSize: square ? 44 : u * 0.14,
                color: "#94a3b8",
                display: "flex",
              }}
            >
              {card.brokerage}
            </div>
          ) : null}
          <div
            style={{
              marginTop: square ? 40 : u * 0.05,
              display: "flex",
              alignItems: "baseline",
              gap: square ? 20 : u * 0.08,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: square ? 52 : u * 0.16,
                fontWeight: 700,
                letterSpacing: "-1px",
                color: "#ffffff",
              }}
            >
              LIQWD<span style={{ color: "#14b8a6" }}>.</span>
            </div>
            <div
              style={{
                fontSize: square ? 34 : u * 0.11,
                color: "#64748b",
                display: "flex",
              }}
            >
              {since}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: { "Cache-Control": CACHE_LIVE, "Content-Type": "image/png" },
    },
  );
}
