"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  collapse?: boolean
}

interface State {
  hasError: boolean
}

export class AdErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AdErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Return fallback UI or null to collapse the space
      return this.props.collapse ? null : this.props.fallback || null
    }

    return this.props.children
  }
}
