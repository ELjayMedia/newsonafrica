import { Skeleton } from '@/components/ui/skeleton';

export function AuthorPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Skeleton className="w-24 h-24 rounded-full mr-6" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-8 w-64 mb-4" />
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
            <Skeleton className="w-full aspect-[16/9]" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
