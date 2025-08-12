import Image from 'next/image'
import Link from 'next/link'
import type { WordPressPost } from '@/lib/api/wordpress'

interface Props {
  post: WordPressPost | null
}

export function TopStory({ post }: Props) {
  if (!post) return null
  const updated = post.modified ? new Date(post.modified) : new Date(post.date)
  const diffHours = Math.round((Date.now() - updated.getTime()) / 3600000)
  return (
    <article className="space-y-3">
      {post.featuredImage?.node?.sourceUrl && (
        <Image
          src={post.featuredImage.node.sourceUrl}
          alt={post.featuredImage.node.altText || post.title}
          width={1280}
          height={720}
          className="w-full aspect-video object-cover"
          priority
        />
      )}
      <Link href={`/post/${post.slug}`} className="text-2xl font-bold leading-tight">
        {post.title}
      </Link>
      <p
        className="text-sm text-muted-foreground line-clamp-2"
        dangerouslySetInnerHTML={{ __html: post.excerpt }}
      />
      <time dateTime={updated.toISOString()} className="text-xs text-gray-500">
        Updated {diffHours}h ago
      </time>
    </article>
  )
}
