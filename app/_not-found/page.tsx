export default function NotFoundPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1rem",
        textAlign: "center",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <h1 style={{ fontSize: "6rem", fontWeight: "bold", color: "#1a202c", margin: "0" }}>404</h1>
      <h2 style={{ fontSize: "2rem", fontWeight: "bold", color: "#4a5568", marginTop: "1rem" }}>Page Not Found</h2>
      <p style={{ fontSize: "1.125rem", color: "#718096", marginTop: "1rem" }}>
        Sorry, we couldn't find the page you're looking for.
      </p>
      <a
        href="/"
        style={{
          display: "inline-block",
          marginTop: "2rem",
          padding: "0.75rem 1.5rem",
          backgroundColor: "#3182ce",
          color: "white",
          borderRadius: "0.25rem",
          textDecoration: "none",
          fontWeight: "medium",
        }}
      >
        Return to Homepage
      </a>
    </div>
  )
}
