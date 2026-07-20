import { ImageResponse } from "next/og";

// Apple touch icons must be raster — SVG is only honoured for `icon`. Rendering
// it here keeps one source of truth for the mark without adding an image
// dependency to the project.
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
          background: "#16140F",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <path
            d="M8.6 6.4a12 12 0 1 1-2.2 2.2"
            stroke="#EDEBE7"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M16 9.5a6.5 6.5 0 0 1 6.2 8.4"
            stroke="#EDEBE7"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.24"
          />
          <circle cx="16" cy="4" r="2.9" fill="#2D6BFF" />
          <circle cx="5.6" cy="22" r="2.25" fill="#EDEBE7" />
          <circle cx="26.4" cy="22" r="1.75" fill="#EDEBE7" opacity="0.78" />
        </svg>
      </div>
    ),
    size,
  );
}
