import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { PostContent } from '@/components/PostContent';
import { PostSkeleton } from '@/components/PostSkeleton';
import Comments from '@/features/comments/Comments';
import { getPostBySlug, getLatestPosts } from '@/lib/api/wordpress';
import type { WordPressPost } from '@/lib/api/wordpress';

export const revalidate = 300; // Revalidate every 5 minutes

interface PostPageProps {
  params: { slug: string };
}

// Generate static paths for posts at build time
export async function generateStaticParams() {
  console.log('🚀 Starting generateStaticParams for posts...');

  try {
    const startTime = Date.now();
    const { posts, hasNextPage } = await getLatestPosts(1000);

    const fetchTime = Date.now() - startTime;
    console.log(`✅ Fetched ${posts.length} posts in ${fetchTime}ms`);
    console.log(`📄 Has more pages: ${hasNextPage}`);

    if (!posts || posts.length === 0) {
      console.warn('⚠️ No posts returned from API. Skipping static generation.');
      return [];
    }

    const validPosts = posts.filter((post) => {
      if (!post.slug) {
        console.warn(`⚠️ Post missing slug: ${post.title || post.id}`);
        return false;
      }
      if (typeof post.slug !== 'string') {
        console.warn(`⚠️ Invalid slug type for post: ${post.title || post.id}`);
        return false;
      }
      return true;
    });

    console.log(`✅ ${validPosts.length} valid posts out of ${posts.length} total`);

    if (validPosts.length > 0) {
      console.log('📝 Sample posts being pre-generated:');
      validPosts.slice(0, 5).forEach((post, index) => {
        console.log(`  ${index + 1}. ${post.slug} - "${post.title}"`);
      });

      if (validPosts.length > 5) {
        console.log(`  ... and ${validPosts.length - 5} more posts`);
      }
    }

    const staticParams = validPosts.map((post) => ({
      slug: post.slug,
    }));

    console.log(`🎯 Generating static params for ${staticParams.length} posts`);
    return staticParams;
  } catch (error) {
    console.error('❌ Error in generateStaticParams for posts:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    console.log('🔄 Falling back to on-demand generation');
    return [];
  }
}

function buildPostMetadata(post: WordPressPost, slug: string): Metadata {
  const cleanExcerpt = post.excerpt?.replace(/<[^>]*>/g, '').trim() || '';
  const description = post.seo?.metaDesc || cleanExcerpt || `Read ${post.title} on News On Africa`;

  const featuredImageUrl =
    post.seo?.opengraphImage?.sourceUrl ||
    post.featuredImage?.node?.sourceUrl ||
    '/default-og-image.jpg';

  const keywords = [
    ...(post.categories?.nodes?.map((cat) => cat.name) || []),
    ...(post.tags?.nodes?.map((tag) => tag.name) || []),
    'News On Africa',
    'African News',
    post.author.node.name,
  ].join(', ');

  const canonicalUrl = `https://newsonafrica.com/post/${slug}`;

  return {
    title: post.seo?.title || `${post.title} - News On Africa`,
    description,
    keywords,
    authors: [
      {
        name: post.author.node.name,
        url: `https://newsonafrica.com/author/${post.author.node.slug}`,
      },
    ],
    creator: post.author.node.name,
    publisher: 'News On Africa',
    category: post.categories?.nodes?.[0]?.name || 'News',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-US': canonicalUrl,
        en: canonicalUrl,
      },
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
      bingBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
      },
    },
    openGraph: {
      type: 'article',
      title: post.seo?.title || post.title,
      description,
      url: canonicalUrl,
      siteName: 'News On Africa',
      locale: 'en_US',
      publishedTime: post.date,
      modifiedTime: post.modified || post.date,
      expirationTime: undefined,
      authors: [post.author.node.name],
      section: post.categories?.nodes?.[0]?.name || 'News',
      tags: post.tags?.nodes?.map((tag) => tag.name) || [],
      images: [
        {
          url: featuredImageUrl,
          width: 1200,
          height: 630,
          alt: post.featuredImage?.node?.altText || post.title,
          type: 'image/jpeg',
        },
        {
          url: featuredImageUrl,
          width: 800,
          height: 600,
          alt: post.featuredImage?.node?.altText || post.title,
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@newsonafrica',
      creator: `@${post.author.node.slug}`,
      title: post.seo?.title || post.title,
      description,
      images: [
        {
          url: featuredImageUrl,
          alt: post.featuredImage?.node?.altText || post.title,
        },
      ],
    },
    other: {
      'article:author': post.author.node.name,
      'article:published_time': post.date,
      'article:modified_time': post.modified || post.date,
      'article:section': post.categories?.nodes?.[0]?.name || 'News',
      'article:tag': post.tags?.nodes?.map((tag) => tag.name).join(', ') || '',
      'og:site_name': 'News On Africa',
      'og:locale': 'en_US',
    },
  };
}

// Enhanced metadata generation with canonical URLs and robots
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  console.log(`🔍 Generating metadata for post: ${params.slug}`);

  try {
    const post = await getPostBySlug(params.slug, ['post', params.slug]);

    if (!post) {
      console.warn(`⚠️ Post not found for metadata generation: ${params.slug}`);
      return {
        title: 'Article Not Found - News On Africa',
        description: 'The requested article could not be found.',
        robots: {
          index: false,
          follow: false,
          noarchive: true,
          nosnippet: true,
        },
        alternates: {
          canonical: `https://newsonafrica.com/post/${params.slug}`,
        },
      };
    }

    console.log(`✅ Generated metadata for: "${post.title}"`);
    return buildPostMetadata(post, params.slug);
  } catch (error) {
    console.error(`❌ Error generating metadata for post ${params.slug}:`, error);
    return {
      title: 'Article - News On Africa',
      description: 'Read the latest news and articles from across Africa.',
      robots: {
        index: false,
        follow: true,
      },
      alternates: {
        canonical: `https://newsonafrica.com/post/${params.slug}`,
      },
    };
  }
}

// Main post page component
export default async function PostPage({ params }: PostPageProps) {
  const decodedSlug = decodeURIComponent(params.slug);
  console.log(`📖 Rendering post page: ${params.slug} (decoded: ${decodedSlug})`);

  try {
    // Fetch post data server-side
    const startTime = Date.now();
    const post = await getPostBySlug(decodedSlug, ['post', decodedSlug]);
    const fetchTime = Date.now() - startTime;

    if (!post) {
      console.warn(`⚠️ Post not found: ${params.slug} (decoded: ${decodedSlug})`);
      notFound();
    }

    console.log(`✅ Post data fetched in ${fetchTime}ms: "${post.title}"`);

    return (
      <Suspense fallback={<PostSkeleton />}>
        <PostWrapper post={post} slug={params.slug} decodedSlug={decodedSlug} />
      </Suspense>
    );
  } catch (error) {
    console.error(`❌ Error fetching post ${params.slug} (decoded: ${decodedSlug}):`, error);
    // Let error boundary handle this
    throw error;
  }
}

// Wrapper component to handle post rendering
function PostWrapper({
  post,
  slug,
  decodedSlug,
}: {
  post: WordPressPost;
  slug: string;
  decodedSlug: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Additional head elements for enhanced SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: post.title,
            description: post.excerpt?.replace(/<[^>]*>/g, '').trim(),
            image: {
              '@type': 'ImageObject',
              url: post.featuredImage?.node?.sourceUrl,
              width: 1200,
              height: 630,
            },
            datePublished: post.date,
            dateModified: post.modified || post.date,
            author: {
              '@type': 'Person',
              name: post.author.node.name,
              url: `https://newsonafrica.com/author/${post.author.node.slug}`,
            },
            publisher: {
              '@type': 'Organization',
              name: 'News On Africa',
              logo: {
                '@type': 'ImageObject',
                url: 'https://newsonafrica.com/news-on-africa-logo.png',
                width: 200,
                height: 60,
              },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://newsonafrica.com/post/${decodedSlug}`,
            },
            articleSection: post.categories?.nodes?.[0]?.name || 'News',
            keywords: [
              ...(post.categories?.nodes?.map((cat: { name: string }) => cat.name) || []),
              ...(post.tags?.nodes?.map((tag: { name: string }) => tag.name) || []),
            ].join(', '),
            wordCount: post.content?.replace(/<[^>]*>/g, '').split(' ').length || 0,
            inLanguage: 'en-US',
            url: `https://newsonafrica.com/post/${decodedSlug}`,
          }),
        }}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://newsonafrica.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: post.categories?.nodes?.[0]?.name || 'News',
                item: `https://newsonafrica.com/category/${post.categories?.nodes?.[0]?.slug || 'news'}`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: post.title,
                item: `https://newsonafrica.com/post/${decodedSlug}`,
              },
            ],
          }),
        }}
      />

      <PostContent post={post} />
      <Comments slug={slug} articleId={decodedSlug} />
    </div>
  );
}
