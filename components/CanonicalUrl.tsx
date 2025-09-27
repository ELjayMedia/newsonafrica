interface CanonicalUrlProps {
  path: string
}

// This component is now deprecated in favor of metadata API
// Canonical URLs should be set in generateMetadata functions
export function CanonicalUrl({ path }: CanonicalUrlProps) {
  // Component kept for backward compatibility but renders nothing
  // Canonical URLs are now handled via the metadata API in page components
  return null
}
