"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchSinglePost } from "@/lib/wordpress-api"
import Image from "next/image"
import Link from "next/link"
import { Clock, User } from "lucide-react"
import { SocialShare } from "@/components/SocialShare"
import { BookmarkButton } from "@/components/BookmarkButton"
import { ArticleJsonLd } from "@/components/ArticleJsonLd"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { useEffect, useState, useRef } from "react"
import ReactDOM from "react-dom"
import { AdComponent } from "@/components/AdComponent"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SocialMetadata } from "@/components/SocialMetadata"
import { handleError } from "@/lib/error-handler"
import { StructuredData } from "@/components/StructuredData"
import { PostSkeleton } from "@/components/PostSkeleton"
import { CommentList } from "@/components/CommentList"

export function PostContent({ slug }: { slug: string }) {
  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchSinglePost(slug),
    suspense: false,
    onError: (error) => handleError(error),
  })

  const [content, setContent] = useState(post?.content || "")
  const adSenseScriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    if (post) {
      setContent(insertAdsInContent(post.content))
    }
  }, [post])

  useEffect(() => {
    if (post && !adSenseScriptRef.current) {
      const script = document.createElement("script")
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6089753674605524"
      script.async = true
      script.crossOrigin = "anonymous"
      document.head.appendChild(script)
      adSenseScriptRef.current = script
    }

    if (post) {
      const adPlaceholders = document.querySelectorAll(".ad-placeholder")
      adPlaceholders.forEach((placeholder, index) => {
        if (index % 2 === 0) {
          const adSenseAd = document.createElement("ins")
          adSenseAd.className = "adsbygoogle"
          adSenseAd.style.display = "block"
          adSenseAd.style.textAlign = "center"
          adSenseAd.dataset.adLayout = "in-article"
          adSenseAd.dataset.adFormat = "fluid"
          adSenseAd.dataset.adClient = "ca-pub-6089753674605524"
          adSenseAd.dataset.adSlot = "7364467238"
          placeholder.appendChild(adSenseAd)

          const adScript = document.createElement("script")
          adScript.textContent = "(adsbygoogle = window.adsbygoogle || []).push({});"
          placeholder.appendChild(adScript)
        } else {
          const AdComponentToRender = () => (
            <>
              <div className="block md:hidden">
                <AdComponent zoneId={index === 1 ? "20" : "21"} className="my-4" />
              </div>
              <div className="hidden md:block">
                <AdComponent zoneId={index === 1 ? "14" : "15"} className="my-4" />
              </div>
            </>
          )
          ReactDOM.render(<AdComponentToRender />, placeholder)
        }
      })
    }

    return () => {
      const adPlaceholders = document.querySelectorAll(".ad-placeholder")
      adPlaceholders.forEach((placeholder) => {
        ReactDOM.unmountComponentAtNode(placeholder)
      })
    }
  }, [post])

  if (isLoading) return <PostSkeleton />
  if (error) return <ErrorMessage message={(error as Error).message} />
  if (!post) return <ErrorMessage message="Post not found" />

  const insertAdsInContent = (content: string) => {
    const paragraphs = content.split("</p>")
    const totalParagraphs = paragraphs.length

    const adIndexes = [
      Math.min(Math.floor(totalParagraphs * 0.25), 3),
      Math.min(Math.floor(totalParagraphs * 0.5), totalParagraphs - 3),
      Math.min(Math.floor(totalParagraphs * 0.75), totalParagraphs - 2),
    ]

    const adComponent = (index: number) => `
      <div class="ad-placeholder" data-ad-index="${index}"></div>
    `

    adIndexes.forEach((index, i) => {
      if (totalParagraphs > index) {
        paragraphs.splice(index + i, 0, adComponent(i))
      }
    })

    return paragraphs.join("</p>")
  }

  return (
    <>
      <SocialMetadata
        title={post.title}
        description={post.excerpt}
        image={post.featuredImage?.node?.sourceUrl || "https://newsonafrica.com/default-og-image.jpg"}
        url={`https://newsonafrica.com/post/${slug}`}
      />
      <StructuredData post={post} url={`https://newsonafrica.com/post/${slug}`} />
      <Breadcrumbs
        items={[
          {
            label: post.categories.nodes[0]?.name || "Uncategorized",
            href: `/category/${post.categories.nodes[0]?.slug || "uncategorized"}`,
          },
          { label: post.title, href: `/post/${post.slug}` },
        ]}
      />
      <article className="max-w-3xl mx-auto px-1 sm:px-2 md:px-4">
        <ArticleJsonLd post={post} url={`https://newsonafrica.com/post/${slug}`} />
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between text-gray-600 text-sm space-y-2 md:space-y-0 mb-2 md:mb-4">
            <div className="hidden md:flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </div>
            <div className="flex items-center justify-between md:justify-end w-full md:w-auto">
              <div className="md:hidden flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
              <div className="flex items-center space-x-2">
                <SocialShare
                  url={`https://newsonafrica.com/post/${slug}`}
                  title={post.title}
                  description={post.excerpt}
                />
              </div>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4">{post.title}</h1>
          <div className="flex items-center justify-between mt-2 md:mt-0">
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              <Link href={`/author/${post.author.node.slug}`} className="hover:underline text-gray-600 text-sm">
                {post.author.node.name}
              </Link>
            </div>
            <BookmarkButton post={post} />
          </div>
        </header>

        {post.featuredImage && (
          <div className="relative w-full aspect-[16/9] mb-4 sm:mb-6">
            <Image
              src={post.featuredImage.node.sourceUrl || "/placeholder.svg"}
              alt={post.featuredImage.node.altText || post.title}
              layout="fill"
              objectFit="cover"
              className="rounded-lg"
              loading="eager"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <div
          dangerouslySetInnerHTML={{ __html: content }}
          className="prose prose-xs sm:prose-sm max-w-none space-y-3 sm:space-y-4"
        />

        <footer className="mt-6 sm:mt-8 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
            <div className="sm:max-w-[60%]">
              <p className="text-gray-600">
                By{" "}
                <Link href={`/author/${post.author.node.slug}`} className="font-semibold hover:underline">
                  {post.author.node.name}
                </Link>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Last updated:{" "}
                {new Date(post.modified).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {post.categories.nodes.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Tags:</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.nodes.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/tag/${tag.slug}`}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm px-2 py-1 rounded"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        </footer>

        {/* Comments Section */}
        <ErrorBoundary fallback={<div>Error loading comments. Please try refreshing the page.</div>}>
          <div className="mt-8">
            <CommentList postId={post.id} />
          </div>
        </ErrorBoundary>
      </article>
    </>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="max-w-3xl mx-auto text-center py-10">
      <h2 className="text-2xl font-bold text-red-600 mb-4">{message}</h2>
      <Link href="/" className="text-blue-600 hover:underline">
        Return to Homepage
      </Link>
    </div>
  )
}
