import { ImageResponse } from "next/og";

/**
 * Default social-share card for pages without their own OG image (project
 * pages already use their hero). Wordmark on ink with the market line.
 */
export const alt = "LIQWD — New & Pre-Construction Homes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background: "#0b1220",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 132,
            fontWeight: 700,
            letterSpacing: "-6px",
          }}
        >
          LIQWD
          <span style={{ color: "#14b8a6" }}>.</span>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 38,
            color: "#94a3b8",
            display: "flex",
          }}
        >
          New &amp; pre-construction homes, from Toronto to Miami
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 28,
            color: "#14b8a6",
            display: "flex",
          }}
        >
          Ontario · BC · Alberta · Florida · Texas · Tennessee · California
        </div>
      </div>
    ),
    { ...size },
  );
}
