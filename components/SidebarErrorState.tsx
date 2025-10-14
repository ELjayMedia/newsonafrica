import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarErrorStateProps {
  onRetry: () => void
}

export function SidebarErrorState({ onRetry }: SidebarErrorStateProps) {
  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-800 mb-1">Unable to load content</h3>
            <p className="text-sm text-red-700 mb-3">
              We're having trouble loading the sidebar content. This might be a temporary issue.
            </p>
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="text-red-700 border-red-300 hover:bg-red-100 bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
