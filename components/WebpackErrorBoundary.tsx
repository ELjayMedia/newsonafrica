"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class WebpackErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })

    // Log the error to an error reporting service
    console.error("Webpack error caught by boundary:", error, errorInfo)

    // Check if it's a chunk loading error
    if (error.message && (error.message.includes("Loading chunk") || error.message.includes("Loading CSS chunk"))) {
      // Wait a moment and try to reload the page
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
          <p className="text-sm text-red-600 mt-1">
            The application encountered an error. Please try refreshing the page.
          </p>
          <button
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default WebpackErrorBoundary
