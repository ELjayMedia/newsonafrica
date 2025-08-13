import { NextResponse } from 'next/server';

import { siteConfig } from '@/config/site';
import { fetchPosts, fetchCategories, fetchTags, fetchAuthors } from '@/lib/wordpress-api';

export async function GET() {
  const baseUrl = siteConfig.url || 'https://newsonafrica.com';

  try {
    // Fetch all necessary data in parallel
    const [posts, categories, tags, authors] = await Promise.all([
      fetchPosts(1000),
      fetchCategories(),
      fetchTags(),
      fetchAuthors(),
    ]);

    // Build the sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Add posts
    posts.forEach((post) => {
      const postDate = new Date(post.modified || post.date).toISOString();

      sitemap += `
  <url>
    <loc>${baseUrl}/post/${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    ${
      post.featuredImage?.node?.sourceUrl
        ? `
    <image:image>
      <image:loc>${post.featuredImage.node.sourceUrl}</image:loc>
      <image:title>${post.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')}</image:title>
    </image:image>`
        : ''
    }
  </url>`;
    });

    // Add categories
    categories.forEach((category) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    // Add tags
    tags.forEach((tag) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/tag/${tag.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    // Add authors
    authors.forEach((author) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/author/${author.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating server sitemap:', error);
    return new NextResponse('Error generating server sitemap', { status: 500 });
  }
}
