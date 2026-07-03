import { ImageResponse } from "next/og";

/** iOS home-screen icon (iOS applies its own corner mask). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 116,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: "-5px",
        }}
      >
        L
        <span style={{ color: "#14b8a6", fontSize: 124 }}>.</span>
      </div>
    ),
    { ...size },
  );
}
