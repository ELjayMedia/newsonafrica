"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, Settings, TrendingUp } from "lucide-react"
import { useAuthModal } from "@/hooks/useAuthModal"
import { PostList } from "@/components/PostList"

export function ForYouContent() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const { open: openAuthModal } = useAuthModal()
  const [activeTab, setActiveTab] = useState("for-you")
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true)

        // If user is logged in and has interests, fetch personalized posts
        if (user && profile?.interests && profile.interests.length > 0) {
          const res = await fetch(`/api/posts/personalized?interests=${profile.interests.join(",")}`)
          const data = await res.json()
          setPosts(data.posts)
        } else {
          // Otherwise fetch trending posts
          const res = await fetch("/api/posts/trending")
          const data = await res.json()
          setPosts(data.posts)
        }
      } catch (error) {
        console.error("Error fetching posts:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [user, profile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">For You</h1>
        {user ? (
          <Button variant="outline" size="sm" onClick={() => router.push("/profile/preferences")}>
            <Settings className="h-4 w-4 mr-2" />
            Customize Feed
          </Button>
        ) : (
          <Button
            onClick={() =>
              openAuthModal({
                defaultTab: "signin",
                title: "Sign in to personalize your feed",
                description: "Create an account to get news tailored to your interests.",
              })
            }
          >
            Sign in to personalize
          </Button>
        )}
      </div>

      {!user && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Personalize your news experience</h2>
          <p className="text-blue-700 mb-4">
            Sign in to get a personalized feed based on your interests and reading history.
          </p>
          <div className="flex space-x-4">
            <Button
              onClick={() =>
                openAuthModal({
                  defaultTab: "signin",
                  title: "Sign in to personalize your feed",
                  description: "Access your personalized news feed and more.",
                })
              }
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                openAuthModal({
                  defaultTab: "signup",
                  title: "Create an account",
                  description: "Join News On Africa to get personalized news and more.",
                })
              }
            >
              Create Account
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="for-you" className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            For You
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="for-you" className="mt-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <PostList posts={posts} />
          )}
        </TabsContent>

        <TabsContent value="trending" className="mt-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <PostList posts={posts} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
