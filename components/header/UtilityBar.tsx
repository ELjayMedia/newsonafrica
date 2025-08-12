'use client'
import Link from 'next/link'

export function UtilityBar() {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return (
    <div className="bg-gray-100 text-xs py-2 px-3 flex justify-between">
      <div className="space-x-3">
        <Link href="/" className="font-semibold">
          NewsOnAfrica
        </Link>
      </div>
      <div className="flex items-center space-x-3">
        <span>{date}</span>
        <Link href="/subscribe" className="hover:underline">
          Subscribe
        </Link>
        <Link href="/auth" className="hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}
