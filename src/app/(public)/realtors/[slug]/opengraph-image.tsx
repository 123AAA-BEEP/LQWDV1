import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

/**
 * Per-agent social-share card for /realtors/{slug} — the link unfurl IS the
 * demo. Real estate happens in iMessage/WhatsApp/Instagram DMs; when an agent
 * drops their page link in a group chat, this is what the recipients see:
 * their banner, their face, their name, "Verified agent". Falls back to the
 * unclaimed treatment for prospect pages and to the brand card when neither
 * resolves. Uses a bare anon client (no cookies exist in OG rendering).
 */

export const alt = "Verified real estate agent on LIQWD";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface CardRow {
  first_name: string | null;
  last_name: string | null;
  brokerage: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  service_area: string | null;
}

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const Wordmark = ({ fontSize = 44 }: { fontSize?: number }) => (
  <div
    style={{
      display: "flex",
      alignItems: "baseline",
      fontSize,
      fontWeight: 700,
      letterSpacing: "-2px",
      color: "#ffffff",
    }}
  >
    LIQWD
    <span style={{ color: "#14b8a6" }}>.</span>
  </div>
);

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = anonClient();

  const { data } = await supabase
    .from("public_realtor_cards")
    .select("first_name, last_name, brokerage, avatar_url, banner_url, service_area")
    .eq("slug", slug)
    .maybeSingle();
  let card = (data as CardRow) ?? null;
  let unclaimed = false;

  if (!card) {
    const { data: prospect } = await supabase
      .from("prospect_pages")
      .select("first_name, last_name, brokerage, city")
      .eq("slug", slug)
      .maybeSingle();
    if (prospect) {
      unclaimed = true;
      card = {
        first_name: prospect.first_name,
        last_name: prospect.last_name,
        brokerage: prospect.brokerage,
        avatar_url: null,
        banner_url: null,
        service_area: prospect.city,
      };
    }
  }

  if (!card) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0b1220",
          }}
        >
          <Wordmark fontSize={120} />
        </div>
      ),
      { ...size },
    );
  }

  const name =
    [card.first_name, card.last_name].filter(Boolean).join(" ") || "LIQWD Agent";
  const initial = name.slice(0, 1).toUpperCase();
  const subline = [card.brokerage, card.service_area].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b1220",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Banner strip */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 280,
            background: unclaimed
              ? "linear-gradient(90deg, #334155, #475569, #64748b)"
              : "linear-gradient(90deg, #0f766e, #0d9488, #14b8a6)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {card.banner_url ? (
            <img
              src={card.banner_url}
              alt=""
              width={1200}
              height={280}
              style={{ width: 1200, height: 280, objectFit: "cover" }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(11,18,32,0) 30%, rgba(11,18,32,0.85) 100%)",
              display: "flex",
            }}
          />
        </div>

        {/* Identity block */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 44,
            padding: "0 72px",
            marginTop: -110,
          }}
        >
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 32,
              border: "8px solid #0b1220",
              background: "#1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {card.avatar_url ? (
              <img
                src={card.avatar_url}
                alt=""
                width={220}
                height={220}
                style={{ width: 220, height: 220, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  fontSize: 110,
                  fontWeight: 700,
                  color: "#64748b",
                  display: "flex",
                }}
              >
                {initial}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingBottom: 18,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-2px",
                display: "flex",
              }}
            >
              {name}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: unclaimed ? "#334155" : "#065f46",
                  color: unclaimed ? "#cbd5e1" : "#6ee7b7",
                  fontSize: 30,
                  fontWeight: 600,
                  padding: "8px 22px",
                  borderRadius: 999,
                }}
              >
                {unclaimed ? "Unclaimed profile" : "✓ Verified agent"}
              </div>
            </div>
            {subline ? (
              <div
                style={{
                  marginTop: 16,
                  fontSize: 34,
                  color: "#94a3b8",
                  display: "flex",
                }}
              >
                {subline.length > 60 ? `${subline.slice(0, 57)}…` : subline}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 72,
            right: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 30, color: "#64748b", display: "flex" }}>
            New construction &amp; pre-construction homes
          </div>
          <Wordmark />
        </div>
      </div>
    ),
    { ...size },
  );
}
