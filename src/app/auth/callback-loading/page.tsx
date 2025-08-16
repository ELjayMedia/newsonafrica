import { Loader2 } from "lucide-react"

export default function AuthCallbackLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        <h2 className="mt-4 text-xl font-semibold">Processing your login...</h2>
        <p className="mt-2 text-gray-600">Please wait while we authenticate your account.</p>
      </div>
    </div>
  )
}
