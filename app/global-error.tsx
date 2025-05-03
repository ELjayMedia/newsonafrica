"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <head>
        <title>Error - News On Africa</title>
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
                font-size: 2rem;
                font-weight: bold;
                color: #e53e3e;
                margin: 0;
              }
              p {
                font-size: 1.125rem;
                color: #718096;
                margin-top: 1rem;
              }
              button {
                margin-top: 2rem;
                padding: 0.75rem 1.5rem;
                background-color: #3182ce;
                color: white;
                border: none;
                border-radius: 0.25rem;
                text-decoration: none;
                font-weight: 500;
                cursor: pointer;
              }
              button:hover {
                background-color: #2c5282;
              }
            `,
          }}
        />
      </head>
      <body>
        <div>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Please try again later.</p>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  )
}
