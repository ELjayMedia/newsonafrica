export default function GlobalNotFound() {
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
          <h2 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "16px" }}>404 - Page Not Found</h2>
          <p style={{ marginBottom: "32px" }}>Sorry, we couldn't find the page you're looking for.</p>
          <a
            href="/"
            style={{
              color: "#2563eb",
              textDecoration: "underline",
            }}
          >
            Return to Homepage
          </a>
        </div>
      </body>
    </html>
  )
}
