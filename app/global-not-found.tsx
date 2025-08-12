import Link from "next/link"

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <head>
        <title>404 - Page Not Found | News On Africa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "16px",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            background: "#f9fafb",
          }}
        >
          <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "16px", color: "#111" }}>
            404 - Page Not Found
          </h2>
          <p style={{ marginBottom: "32px", color: "#6B7280", lineHeight: "1.5" }}>
            Sorry, we couldn't find the page you're looking for.
          </p>
          <Link
            href="/"
            style={{
              color: "#2563eb",
              textDecoration: "underline",
              fontSize: "1rem",
            }}
          >
            Return to Homepage
          </Link>
        </div>
      </body>
    </html>
  )
}
