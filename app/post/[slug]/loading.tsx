import { PostSkeleton } from '@/components/PostSkeleton';

export default function PostLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PostSkeleton />
    </div>
  );
}
