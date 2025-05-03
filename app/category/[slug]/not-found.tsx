export default function CategoryNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-3xl font-bold mb-4">Category Not Found</h2>
      <p className="mb-8">Sorry, we couldn't find the category you're looking for.</p>
      <a href="/" className="text-blue-600 hover:underline">
        Return to Homepage
      </a>
    </div>
  )
}
