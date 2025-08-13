import { Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  slug: string;
  date: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
    };
  };
}

interface RelatedPostsProps {
  posts: Post[];
  title?: string;
}

export function RelatedPosts({ posts, title = 'Related Posts' }: RelatedPostsProps) {
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="my-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.id} href={`/post/${post.slug}`} className="group">
            <article className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col">
              <div className="relative h-40">
                <Image
                  src={
                    post.featuredImage?.node?.sourceUrl ||
                    '/placeholder.svg?height=300&width=500&query=related news'
                  }
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <div className="flex items-center text-sm text-gray-500 mt-auto">
                  <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
