import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import type { WordPressPost } from '@/lib/api/wordpress'

interface Props {
  title: string
  slug: string
  layout: 'grid' | 'list' | 'horizontal' | 'vertical'
  posts: WordPressPost[]
}

export function CategoryRail({ title, layout, posts }: Props) {
  if (!posts.length) return null
  const containerClass =
    layout === 'grid'
      ? 'grid grid-cols-2 gap-4'
      : layout === 'horizontal'
        ? 'flex overflow-x-auto gap-4'
        : 'space-y-4'
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className={containerClass}>
        {posts.map((post) => (
          <Card key={post.id} className={layout === 'horizontal' ? 'min-w-[16rem]' : ''}>
            {post.featuredImage?.node?.sourceUrl && (
              <Image
                src={post.featuredImage.node.sourceUrl}
                alt={post.featuredImage.node.altText || post.title}
                width={400}
                height={225}
                className="w-full aspect-video object-cover"
                loading="lazy"
              />
            )}
            <div className="p-3">
              <Link href={`/post/${post.slug}`} className="font-medium line-clamp-2">
                {post.title}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
