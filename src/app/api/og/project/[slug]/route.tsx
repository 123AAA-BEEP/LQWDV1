import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Presented by {agent}" social card for shared project links.
 *
 * When an agent texts liqwd.ca/projects/{slug}?ref=CODE into a group chat,
 * the unfurl shows the project hero WITH the agent's face and name on it —
 * the recipient sees a person, not a listing site. The ref is validated
 * against public_realtor_cards (approved + public agents only); when it
 * doesn't resolve, the card renders without the agent strip, so a stale or
 * fake code degrades gracefully. Public-safe data only, CDN-cached.
 */

const WIDTH = 1200;
const HEIGHT = 630;

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") ?? "").trim().toUpperCase();

  const supabase = anonClient();
  const [{ data: project }, { data: agent }] = await Promise.all([
    supabase
      .from("public_projects_view")
      .select("project_name, city, hero_image_url")
      .eq("slug", slug)
      .maybeSingle(),
    ref && /^[A-Z0-9]{4,16}$/.test(ref)
      ? supabase
          .from("public_realtor_cards")
          .select("first_name, last_name, brokerage, avatar_url")
          .eq("referral_code", ref)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!project) {
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
            color: "#ffffff",
            fontSize: 100,
            fontWeight: 700,
            letterSpacing: "-4px",
          }}
        >
          LIQWD<span style={{ color: "#14b8a6" }}>.</span>
        </div>
      ),
      { width: WIDTH, height: HEIGHT },
    );
  }

  const agentName = agent
    ? [agent.first_name, agent.last_name].filter(Boolean).join(" ")
    : null;

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
        {project.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse JSX; next/image cannot render here
          <img
            src={project.hero_image_url}
            alt=""
            width={WIDTH}
            height={HEIGHT}
            style={{
              position: "absolute",
              inset: 0,
              width: WIDTH,
              height: HEIGHT,
              objectFit: "cover",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(11,18,32,0.05) 30%, rgba(11,18,32,0.92) 100%)",
            display: "flex",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            padding: "0 64px 44px",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-2px",
              display: "flex",
            }}
          >
            {project.project_name.length > 34
              ? `${project.project_name.slice(0, 31)}…`
              : project.project_name}
          </div>
          {project.city ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 34,
                color: "#cbd5e1",
                display: "flex",
              }}
            >
              {project.city}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {agentName ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: "rgba(15,23,42,0.85)",
                  borderRadius: 999,
                  padding: "12px 28px 12px 12px",
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 999,
                    background: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {agent?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ImageResponse JSX; next/image cannot render here
                    <img
                      src={agent.avatar_url}
                      alt=""
                      width={76}
                      height={76}
                      style={{ width: 76, height: 76, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 38,
                        fontWeight: 700,
                        color: "#64748b",
                        display: "flex",
                      }}
                    >
                      {agentName.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      color: "#ffffff",
                      display: "flex",
                    }}
                  >
                    Presented by {agentName}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      color: "#6ee7b7",
                      display: "flex",
                    }}
                  >
                    ✓ Verified agent
                    {agent?.brokerage ? ` · ${agent.brokerage}` : ""}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: "-2px",
                color: "#ffffff",
              }}
            >
              LIQWD<span style={{ color: "#14b8a6" }}>.</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}
