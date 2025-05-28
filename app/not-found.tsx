export default function NotFound() {
  return (
    <html>
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
          }}
        >
          <h1 style={{ fontSize: "4rem", fontWeight: "bold", color: "#111", marginBottom: "16px" }}>404</h1>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#374151", marginBottom: "24px" }}>
            Page Not Found
          </h2>
          <p style={{ color: "#6B7280", marginBottom: "32px", maxWidth: "400px" }}>
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <a
            href="/"
            style={{
              padding: "12px 24px",
              backgroundColor: "#000",
              color: "#fff",
              fontWeight: "500",
              borderRadius: "6px",
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
          >
            Return to Homepage
          </a>
        </div>
      </body>
    </html>
  )
}
