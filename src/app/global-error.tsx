"use client";

import { useEffect } from "react";

// Only fires if the root layout itself throws — error.tsx can't catch that
// case since it renders inside the layout it's meant to replace. Has to
// render its own <html>/<body> for the same reason: there's no outer
// layout left to provide them. Kept deliberately plain (no Tailwind
// classes referencing the app's font/theme setup) since a failure this
// deep means even that setup may not be trustworthy.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#231f20",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            padding: "2rem",
            borderRadius: "1.75rem",
            backgroundColor: "rgba(255,255,255,0.95)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#8e793e",
              margin: 0,
            }}
          >
            Atlas
          </p>
          <h1 style={{ marginTop: "0.75rem", fontSize: "1.25rem", fontWeight: 600, color: "#231f20" }}>
            Something went wrong.
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6, color: "#57534e" }}>
            That&rsquo;s on us, not something you did. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              borderRadius: "9999px",
              backgroundColor: "#8e793e",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: 500,
              padding: "0.75rem 1.25rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
