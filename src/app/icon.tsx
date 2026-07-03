import { ImageResponse } from "next/og";

/** Browser-tab favicon — the LIQWD mark (ink tile, white L, teal dot). */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 14,
          color: "#ffffff",
          fontSize: 42,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: "-2px",
        }}
      >
        L
        <span style={{ color: "#14b8a6", fontSize: 46 }}>.</span>
      </div>
    ),
    { ...size },
  );
}
