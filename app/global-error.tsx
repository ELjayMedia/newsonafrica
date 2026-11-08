"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global error boundary (NOA-84). Replaces the root layout when an error is
 * thrown in the layout itself, so it must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Next.js already reports server errors through onRequestError.
    if (!error.digest) captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Application error</h1>
        <p style={{ color: "#666" }}>A critical error occurred. Please reload the page.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "9999px",
            border: "1px solid #ccc",
            padding: "0.5rem 1.25rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
