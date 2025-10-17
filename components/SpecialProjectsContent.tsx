"use client"

import useSWR from "swr"
import { fetchTaggedPosts } from "@/lib/wordpress-api"
import { getCurrentCountry } from "@/lib/utils/routing"
import { NewsGridClient as NewsGrid } from "@/components/client/NewsGridClient"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"

export function SpecialProjectsContent() {
  const country = getCurrentCountry()
  const {
    data: projectsResponse,
    error,
    isLoading,
  } = useSWR(
    ["specialProjects", country],
    () => fetchTaggedPosts({ slug: "special-project", first: 10, countryCode: country }),
    {
      revalidateOnFocus: false,
    },
  )

  const projects = projectsResponse?.nodes ?? []

  if (isLoading) return <NewsGridSkeleton />
  if (error)
    return <p className="text-center text-red-500">An error occurred while fetching special projects.</p>
  if (projects.length === 0)
    return <p className="text-center">No special projects found.</p>

  return (
    <div className="space-y-8">
      <section className="bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-6">Special Projects</h1>
        <NewsGrid posts={projects} layout="vertical" />
      </section>
    </div>
  )
}
