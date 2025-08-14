import Link from 'next/link';

export default function PostNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-3xl font-bold mb-4">Article Not Found</h2>
      <p className="mb-2">Sorry, we couldn&apos;t find the article you&apos;re looking for.</p>
      <p className="mb-8">It may have been removed or no posts are available.</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Return to Homepage
      </Link>
    </div>
  );
}
