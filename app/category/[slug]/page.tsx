import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import CategoryClientPage from './CategoryClientPage';

import { getCategories, getPostsByCategory } from '@/lib/api/wordpress';
import type { WordPressCategory, WordPressPost } from '@/lib/api/wordpress';
import { createLogger } from '@/lib/logger';

const logger = createLogger('category-page');

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

// Static generation configuration
export const revalidate = 600; // Revalidate every 10 minutes
export const dynamicParams = true; // Allow dynamic params not in generateStaticParams

// Generate static paths for all categories
export async function generateStaticParams() {
  try {
    const categories = await getCategories();

    // Return the first 50 most important categories for static generation
    // Others will be generated on-demand
    return categories.slice(0, 50).map((category) => ({
      slug: category.slug,
    }));
  } catch (error) {
    console.error('Error generating static params for categories:', error);
    // Return empty array to allow all pages to be generated on-demand
    return [];
  }
}

function buildCategoryMetadata(
  category: WordPressCategory,
  posts: WordPressPost[],
  slug: string,
): Metadata {
  const baseDescription =
    category.description || `Latest articles in the ${category.name} category`;
  const postCount = category.count || posts.length;
  const description = `${baseDescription}. Browse ${postCount} articles covering ${category.name.toLowerCase()} news from across Africa.`;

  const featuredPost = posts.find((post) => post.featuredImage?.node?.sourceUrl);
  const featuredImageUrl =
    featuredPost?.featuredImage?.node?.sourceUrl || '/default-category-image.jpg';

  const canonicalUrl = `https://newsonafrica.com/category/${slug}`;

  const keywords = [
    category.name,
    `${category.name} News`,
    'African News',
    'News On Africa',
    ...posts.slice(0, 5).map((post) => post.title.split(' ').slice(0, 3).join(' ')),
  ].join(', ');

  return {
    title: `${category.name} News - News On Africa`,
    description,
    keywords,
    category: category.name,
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
      type: 'website',
      title: `${category.name} - News On Africa`,
      description,
      url: canonicalUrl,
      siteName: 'News On Africa',
      locale: 'en_US',
      images: [
        {
          url: featuredImageUrl,
          width: 1200,
          height: 630,
          alt: `${category.name} news from News On Africa`,
          type: 'image/jpeg',
        },
        {
          url: featuredImageUrl,
          width: 800,
          height: 600,
          alt: `${category.name} news from News On Africa`,
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@newsonafrica',
      title: `${category.name} - News On Africa`,
      description,
      images: [
        {
          url: featuredImageUrl,
          alt: `${category.name} news from News On Africa`,
        },
      ],
    },
    other: {
      'article:section': category.name,
      'article:tag': category.name,
      'og:updated_time': new Date().toISOString(),
      'og:site_name': 'News On Africa',
      'og:locale': 'en_US',
    },
  };
}

// Enhanced metadata generation for categories with canonical URLs and robots
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  logger.debug(`🔍 Generating metadata for category: ${slug}`);

  try {
    const { category, posts } = await getPostsByCategory(slug, 10);

    if (!category) {
      logger.warn(`⚠️ Category not found for metadata generation: ${slug}`);
      return {
        title: 'Category Not Found - News On Africa',
        description: 'The requested category could not be found.',
        robots: {
          index: false,
          follow: false,
          noarchive: true,
        },
        alternates: {
          canonical: `https://newsonafrica.com/category/${slug}`,
        },
      };
    }

    logger.debug(`✅ Generated metadata for category: "${category.name}"`);
    return buildCategoryMetadata(category, posts, slug);
  } catch (error) {
    console.error(`❌ Error generating metadata for category ${slug}:`, error);
    return {
      title: `${slug.charAt(0).toUpperCase() + slug.slice(1)} - News On Africa`,
      description: `Latest articles in the ${slug} category from News On Africa`,
      robots: {
        index: false,
        follow: true,
      },
      alternates: {
        canonical: `https://newsonafrica.com/category/${slug}`,
      },
    };
  }
}

// Server component that fetches data and renders the page
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  try {
    // Fetch category data and initial posts
    const categoryData = await getPostsByCategory(slug, 20);

    // If category doesn't exist, show 404
    if (!categoryData.category) {
      notFound();
    }

    // Pass the fetched data to the client component
    return <CategoryClientPage params={{ slug }} initialData={categoryData} />;
  } catch (error) {
    console.error(`Error loading category page for ${slug}:`, error);

    // For build-time errors, still try to render with empty data
    // The client component will handle the error state
    return <CategoryClientPage params={{ slug }} initialData={null} />;
  }
}
