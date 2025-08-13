import { Skeleton } from '@/components/ui/skeleton';

export function HeaderSkeleton() {
  return (
    <header className="bg-white mx-auto max-w-[980px]">
      <div className="w-full md:mx-auto -mb-4">
        {/* Top Bar */}
        <div className="px-4 pt-3 pb-2 flex flex-wrap items-center justify-between">
          <Skeleton className="h-8 md:h-12 w-[200px]" />

          <div className="flex items-center gap-4 ml-auto">
            <Skeleton className="hidden sm:block w-[200px] h-10" />

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm ml-4">
              <Skeleton className="hidden md:flex h-4 w-24" />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 md:mt-0 bg-white">
          <div className="overflow-x-auto">
            <div className="flex whitespace-nowrap px-4 border-t border-gray-200 font-light">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 mx-1" />
              ))}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
