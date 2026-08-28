import { ImageResponse } from "next/og";

/**
 * iOS will not take an SVG for a touch icon, so this renders a real PNG at
 * build time rather than committing a binary asset that can drift out of step
 * with icon.svg.
 */
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
          // iOS masks to its own rounded shape, so this fills edge to edge.
          background: "#236DC9",
          color: "#FFFFFF",
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: "-0.05em",
        }}
      >
        {"> _"}
      </div>
    ),
    size,
  );
}
