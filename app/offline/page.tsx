import dynamic from "next/dynamic"
import Link from "next/link"

import { SUPPORTED_EDITIONS } from "@/lib/editions"

const OfflineContent = dynamic(() => import("@/components/OfflineContent"), {
  loading: () => null,
})

export default function OfflinePage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold">You&apos;re offline</h1>
          <p className="mt-3 text-base text-gray-600">
            It looks like you&apos;re currently offline. Use the links below to jump to country sections that
            were cached on your device, or try reconnecting when you can.
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <h2 className="text-lg font-semibold">Offline country shortcuts</h2>
          <p className="mt-1 text-sm text-gray-600">
            These links open the cached versions of our African edition and supported country pages.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SUPPORTED_EDITIONS.map((edition) => (
              <li key={edition.code}>
                <Link
                  href={edition.type === "african" ? "/" : `/${edition.code}`}
                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition hover:border-gray-300 hover:bg-gray-100"
                >
                  <span aria-hidden="true" className="text-lg">
                    {edition.flag}
                  </span>
                  <span className="truncate">{edition.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Cached articles</h2>
            <p className="text-sm text-gray-600">
              Previously viewed stories appear here when JavaScript is available. You can still access the
              links above without it.
            </p>
            <noscript>
              <p className="mt-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                Enable JavaScript to view your saved offline articles.
              </p>
            </noscript>
          </div>
          <OfflineContent />
        </section>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  )
}
