"use client"

import { useRouter } from "next/router"

export async function fetchSinglePost(slug) {
  // Replace with your actual API call
  const res = await fetch(`https://api.example.com/posts/${slug}`)
  const post = await res.json()
  return post
}

export async function fetchRecentPosts(limit) {
  // Replace with your actual API call
  const res = await fetch(`https://api.example.com/posts?_limit=${limit}`)
  const posts = await res.json()
  return posts
}

export default function Post({ post }) {
  const router = useRouter()

  if (router.isFallback) {
    return <div>Loading...</div>
  }

  if (!post) {
    return <div>Post not found</div>
  }

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </div>
  )
}

export async function getStaticProps({ params }) {
  const post = await fetchSinglePost(params.slug)

  return {
    props: { post },
    revalidate: 60, // Revalidate every 60 seconds
  }
}

export async function getStaticPaths() {
  const posts = await fetchRecentPosts(10) // Fetch the 10 most recent posts

  const paths = posts.map((post) => ({
    params: { slug: post.slug },
  }))

  return { paths, fallback: "blocking" }
}
