import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatPriceBand } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Ad-creative generator for the Promote kit: composes the project hero into a
 * Meta-ready image (1080×1080 feed square or 1200×628 link/landscape) with a
 * light LIQWD frame and the agent's name + brokerage stamped on — TRESA wants
 * registrant + brokerage on agent advertising, so compliance ships inside the
 * pixels. Auth-gated (approved realtors + admins); the stamp is always the
 * CALLER's identity, so one agent can't mint creative in another's name.
 */

interface ProjRow {
  project_name: string;
  city: string | null;
  sales_status: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  hero_image_url: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const format =
    req.nextUrl.searchParams.get("format") === "landscape"
      ? "landscape"
      : "square";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, brokerage_name, brokerage_id, role, verification_status")
    .eq("id", user.id)
    .maybeSingle();
  const approved =
    profile?.role === "admin" || profile?.verification_status === "approved";
  if (!profile || !approved) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let brokerage = profile.brokerage_name as string | null;
  if (profile.brokerage_id) {
    const { data: b } = await supabase
      .from("brokerages")
      .select("brokerage_name")
      .eq("id", profile.brokerage_id)
      .maybeSingle();
    brokerage = (b?.brokerage_name as string | null) ?? brokerage;
  }

  // Public-safe project fields only (broker view would also work, but the ad
  // is public-facing by definition — keep it to what the page shows anyway).
  const { data: proj } = await supabase
    .from("public_projects_view")
    .select(
      "project_name, city, sales_status, price_from_public, price_to_public, hero_image_url",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!proj) return new NextResponse("Not found", { status: 404 });
  const p = proj as ProjRow;

  const W = format === "landscape" ? 1200 : 1080;
  const H = format === "landscape" ? 628 : 1080;
  const agentName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Verified agent";
  const band = formatPriceBand(p.price_from_public, null);
  const status = p.sales_status
    ? p.sales_status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
    : null;
  const scale = format === "landscape" ? 0.82 : 1;

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
        {/* Hero — full bleed (satori JSX: plain img is the only option) */}
        {p.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.hero_image_url}
            alt=""
            width={W}
            height={H}
            style={{
              position: "absolute",
              inset: 0,
              width: W,
              height: H,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, #0f766e, #0b1220)",
              display: "flex",
            }}
          />
        )}
        {/* Legibility gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(11,18,32,0.35) 0%, rgba(11,18,32,0) 30%, rgba(11,18,32,0) 45%, rgba(11,18,32,0.92) 100%)",
            display: "flex",
          }}
        />

        {/* Top row: brand + status chip */}
        <div
          style={{
            position: "absolute",
            top: 36 * scale,
            left: 44 * scale,
            right: 44 * scale,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: 40 * scale,
              fontWeight: 700,
              letterSpacing: "-1px",
              color: "#ffffff",
              background: "rgba(11,18,32,0.55)",
              padding: `${8 * scale}px ${20 * scale}px`,
              borderRadius: 14,
            }}
          >
            LIQWD
            <span style={{ color: "#14b8a6" }}>.</span>
          </div>
          {status ? (
            <div
              style={{
                display: "flex",
                fontSize: 28 * scale,
                fontWeight: 600,
                color: "#0b1220",
                background: "#ffffff",
                padding: `${10 * scale}px ${24 * scale}px`,
                borderRadius: 999,
              }}
            >
              {status}
            </div>
          ) : null}
        </div>

        {/* Bottom block: project + price + agent stamp */}
        <div
          style={{
            position: "absolute",
            left: 44 * scale,
            right: 44 * scale,
            bottom: 36 * scale,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 62 * scale,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-1.5px",
              lineHeight: 1.05,
              display: "flex",
            }}
          >
            {p.project_name.length > 40
              ? `${p.project_name.slice(0, 37)}…`
              : p.project_name}
          </div>
          <div
            style={{
              marginTop: 10 * scale,
              display: "flex",
              alignItems: "center",
              gap: 16 * scale,
              fontSize: 34 * scale,
              color: "#e2e8f0",
            }}
          >
            {p.city ? <div style={{ display: "flex" }}>{p.city}</div> : null}
            {p.city && band ? (
              <div style={{ display: "flex", color: "#64748b" }}>·</div>
            ) : null}
            {band ? (
              <div
                style={{ display: "flex", fontWeight: 700, color: "#5eead4" }}
              >
                {band}
              </div>
            ) : null}
          </div>
          {/* TRESA stamp: registrant + brokerage, always on */}
          <div
            style={{
              marginTop: 22 * scale,
              display: "flex",
              alignItems: "center",
              gap: 12 * scale,
              fontSize: 26 * scale,
              color: "#cbd5e1",
              borderTop: "1px solid rgba(148,163,184,0.35)",
              paddingTop: 18 * scale,
            }}
          >
            <div style={{ display: "flex", fontWeight: 600, color: "#ffffff" }}>
              {agentName}
            </div>
            {brokerage ? (
              <div style={{ display: "flex" }}>· {brokerage}</div>
            ) : null}
            <div style={{ display: "flex", marginLeft: "auto", color: "#94a3b8" }}>
              liqwd.ca
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
