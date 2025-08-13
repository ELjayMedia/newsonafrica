export function SidebarFallback() {
  return (
    <div className="space-y-4">
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <div className="h-10 w-10 bg-gray-200 rounded"></div>
            <div className="space-y-1 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
