import ErrorBoundary from "./ErrorBoundary"
import HomeContentComponent from "./HomeContentComponent"

const HomeContent: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 text-sm text-gray-600" role="status">
          {"We’re having trouble loading content right now. Please refresh the page."}
        </div>
      }
    >
      <HomeContentComponent />
    </ErrorBoundary>
  )
}

export default HomeContent

// components/CompactHomeContent.tsx
import type React from "react"
import ErrorBoundary from "./ErrorBoundary"
import CompactHomeContentComponent from "./CompactHomeContentComponent"

const CompactHomeContent: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-2 text-xs text-gray-600" role="status">
          {"We’re having trouble loading this section. Pull to refresh or try again later."}
        </div>
      }
    >
      <CompactHomeContentComponent />
    </ErrorBoundary>
  )
}

export default CompactHomeContent;
