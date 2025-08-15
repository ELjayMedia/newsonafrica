import { Clock, MessageSquare, Gift } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BookmarkButton } from '@/components/BookmarkButton';
import { CommentList } from '@/components/CommentList';
import { ReadLogger } from '@/components/ReadLogger';
import { RelatedPosts } from '@/components/RelatedPosts';
import { SocialShare } from '@/components/SocialShare';
import { Button } from '@/components/ui/button';
import type { WordPressPost } from '@/lib/api/wordpress';
import type { Category } from '@/types/category';
import { formatDate } from '@/utils/date-utils';

interface PostContentProps {
  post: WordPressPost;
}

export function PostContent({ post }: PostContentProps) {
  if (!post) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 pb-6 bg-white">
      <ReadLogger
        postId={post.id}
        category={post.categories?.nodes?.[0]?.name}
        tags={post.tags?.nodes?.map((tag: { name: string }) => tag.name)}
      />
      <article className="mb-8">
        {/* Top date and share section */}
        <div className="flex justify-between items-center mb-4 text-sm">
          <div className="flex items-center text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            <time dateTime={post.date}>
              {post.date ? formatDate(post.date, false) : 'Unknown date'}
            </time>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-xs">Share</span>
            <SocialShare
              url={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://newsonafrica.com'}/post/${post.slug}`}
              title={post.title}
              description={post.excerpt || post.title}
              className="flex items-center gap-1"
            />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

        {/* Author and publication */}
        <div className="flex items-center justify-between mb-4 md:mb-3">
          <div className="flex flex-col">
            {post.author && (
              <Link
                href={`/author/${post.author.node.slug}`}
                className="font-medium hover:underline text-sm md:text-base"
              >
                {post.author.node.name}
              </Link>
            )}
          </div>

          {/* Interactive buttons */}
          <div className="flex flex-wrap gap-1 md:gap-2">
            <Button
              variant="outline"
              className="rounded-full flex items-center gap-1 md:gap-2 bg-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
            >
              <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Comments</span>
            </Button>

            <Button
              variant="outline"
              className="rounded-full flex items-center gap-1 md:gap-2 bg-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
            >
              <Gift className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Gift article</span>
            </Button>

            <BookmarkButton
              postId={post.id}
              title={post.title}
              slug={post.slug}
              variant="outline"
              size="sm"
              className="rounded-full flex items-center gap-1 md:gap-2 bg-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
            />
          </div>
        </div>

        {/* Featured image */}
        {post.featuredImage && post.featuredImage.node.sourceUrl && (
          <div className="mb-6">
            <Image
              src={post.featuredImage.node.sourceUrl || '/placeholder.svg'}
              alt={post.featuredImage.node.altText || post.title}
              width={1200}
              height={675}
              className="w-full rounded-lg"
              priority
            />
            {post.featuredImage.node.caption && (
              <figcaption
                className="text-sm text-gray-500 mt-2"
                dangerouslySetInnerHTML={{ __html: post.featuredImage.node.caption }}
              />
            )}
          </div>
        )}

        {/* Article content */}
        <div
          className="prose prose-lg max-w-none mb-8 text-sm text-black"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Categories and tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {post.categories?.nodes?.map((category: Category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
            >
              {category.name}
            </Link>
          ))}
        </div>

        {/* Bottom Social Sharing */}
        <div className="flex items-center justify-center py-6 border-t border-gray-200 mt-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              Found this article helpful? Share it with others!
            </p>
            <SocialShare
              url={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://newsonafrica.com'}/post/${post.slug}`}
              title={post.title}
              description={post.excerpt || post.title}
              className="flex items-center justify-center gap-2"
            />
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <CommentList postId={post.id} />
        </div>

        {/* Related Posts */}
        <RelatedPosts categories={post.categories?.nodes || []} currentPostId={post.id} />
      </article>
    </div>
  );
}
