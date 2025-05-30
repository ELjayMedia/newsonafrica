import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import Script from "next/script"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <Script
        id="google-ad-manager"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
      window.googletag = window.googletag || {cmd: []};
      googletag.cmd.push(function() {
        googletag.pubads().enableSingleRequest();
        googletag.pubads().collapseEmptyDivs();
        googletag.pubads().enableLazyLoad({
          fetchMarginPercent: 500,
          renderMarginPercent: 200,
          mobileScaling: 2.0
        });
        googletag.enableServices();
      });
    `,
        }}
      />
      <Script src="https://securepubads.g.doubleclick.net/tag/js/gpt.js" strategy="afterInteractive" />
      <body>{children}</body>
    </html>
  )
}
