"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[global error]", error);
    }
  }, [error]);

  return (
    <html lang="da">
      <body
        style={{
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#fff",
          color: "#111",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.75rem" }}>
            Appen kunne ikke indlæses
          </h1>
          <p style={{ color: "#555", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
            Der opstod en kritisk fejl. Genindlæs siden for at prøve igen.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              padding: "0.625rem 1.25rem",
              border: "none",
              borderRadius: "0.5rem",
              background: "#00ae5a",
              color: "#fff",
              fontWeight: 500,
              fontSize: "1rem",
            }}
          >
            Prøv igen
          </button>
        </div>
      </body>
    </html>
  );
}
