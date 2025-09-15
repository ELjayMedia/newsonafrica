"use client"

import useSWR from "swr"
import { fetchTaggedPosts } from "@/lib/wordpress-api"
import { NewsGrid } from "@/components/NewsGrid"
import { NewsGridSkeleton } from "@/components/NewsGridSkeleton"

export function SpecialProjectsContent() {
  const {
    data: projects,
    error,
    isLoading,
  } = useSWR(["specialProjects"], () => fetchTaggedPosts("special-project", 10), {
    revalidateOnFocus: false,
  })

  if (isLoading) return <NewsGridSkeleton />
  if (error)
    return <p className="text-center text-red-500">An error occurred while fetching special projects.</p>
  if (!projects || projects.length === 0)
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
