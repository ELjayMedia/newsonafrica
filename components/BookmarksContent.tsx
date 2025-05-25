"use client"

import type React from "react"
import { useQuery } from "@apollo/client"
import { GET_BOOKMARKS } from "@/graphql/queries"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/router"
import Link from "next/link"
import OptimizedImage from "./OptimizedImage"

interface Bookmark {
  id: string
  user_id: string
  post_id: string
  title: string
  slug?: string
  excerpt?: string
  created_at: string
  featured_image?: any
}

const BookmarksContent: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()

  const { loading, error, data } = useQuery(GET_BOOKMARKS, {
    variables: { userId: user?.uid },
    skip: !user,
  })

  if (!user) {
    return (
      <div className="text-center mt-4">
        Please{" "}
        <Link href="/login" className="text-blue-500">
          login
        </Link>{" "}
        to view your bookmarks.
      </div>
    )
  }

  if (loading) return <div className="text-center mt-4">Loading bookmarks...</div>
  if (error) return <div className="text-center mt-4">Error fetching bookmarks: {error.message}</div>

  const bookmarks: Bookmark[] = data?.bookmarks || []

  if (bookmarks.length === 0) {
    return <div className="text-center mt-4">No bookmarks saved yet.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookmarks.map((bookmark) => (
        <div key={bookmark.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          {bookmark.featured_image && (
            <OptimizedImage
              src={
                typeof bookmark.featured_image === "string"
                  ? JSON.parse(bookmark.featured_image)?.node?.sourceUrl || bookmark.featured_image
                  : bookmark.featured_image?.node?.sourceUrl || bookmark.featured_image?.url
              }
              alt={bookmark.title}
              width={400}
              height={200}
              className="w-full h-48 object-cover"
            />
          )}
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">{bookmark.title}</h3>
            <p className="text-gray-600">{bookmark.excerpt}</p>
            <Link href={`/blog/${bookmark.slug}`} className="text-blue-500 mt-2 block">
              Read More
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

export default BookmarksContent
