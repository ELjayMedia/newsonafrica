'use client'
import Link from 'next/link'

export function SponsoredPromo() {
  return (
    <div className="border p-4 text-center rounded-lg" aria-label="Sponsored">
      <span className="block text-xs font-semibold uppercase mb-1">Sponsored</span>
      <Link href="/sponsored" className="text-sm hover:underline">
        Partner story
      </Link>
    </div>
  )
}

export default SponsoredPromo
