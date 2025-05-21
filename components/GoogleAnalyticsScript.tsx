"use client"

import Script from "next/script"

export function GoogleAnalyticsScript() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-DQVSXQ97WQ"

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  )
}
