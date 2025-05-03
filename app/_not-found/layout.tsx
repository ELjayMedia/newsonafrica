import type React from "react"
export default function NotFoundLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>404 - Page Not Found</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                text-align: center;
                background-color: #f7fafc;
              }
              h1 {
                font-size: 6rem;
                font-weight: bold;
                color: #1a202c;
                margin: 0;
              }
              h2 {
                font-size: 2rem;
                font-weight: bold;
                color: #4a5568;
                margin-top: 1rem;
              }
              p {
                font-size: 1.125rem;
                color: #718096;
                margin-top: 1rem;
              }
              a {
                display: inline-block;
                margin-top: 2rem;
                padding: 0.75rem 1.5rem;
                background-color: #3182ce;
                color: white;
                border-radius: 0.25rem;
                text-decoration: none;
                font-weight: 500;
              }
              a:hover {
                background-color: #2c5282;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
