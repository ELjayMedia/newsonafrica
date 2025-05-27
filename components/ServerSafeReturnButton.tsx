import ClientMediaQueryWrapper from "./client/ClientMediaQueryWrapper"
import Link from "next/link"

export default function ServerSafeReturnButton() {
  return (
    <>
      <noscript>
        <Link
          href="/"
          className="px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
        >
          Return to Homepage
        </Link>
      </noscript>
      <ClientMediaQueryWrapper type="returnButton" />
    </>
  )
}
