'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback

      if (FallbackComponent && this.state.error) {
        return (
          <FallbackComponent
            error={this.state.error}
            reset={() => this.setState({ hasError: false, error: null })}
          />
        )
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
            <p className="mb-4 text-gray-600">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => window.location.reload()}
                variant="default"
              >
                Refresh Page
              </Button>
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}