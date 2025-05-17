export default function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Search News on Africa</h1>

      <div className="w-full max-w-4xl mx-auto">
        <div className="relative">
          <div className="w-full h-14 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        <div className="mt-8">
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-blue-600 border-r-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-center text-gray-600">Loading search...</p>
        </div>
      </div>
    </div>
  )
}
