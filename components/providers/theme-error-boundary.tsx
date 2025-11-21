'use client'
import { logger } from '@/lib/logger';

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary specifically for theme provider issues
 * Provides graceful degradation if theme system fails
 */
export class ThemeErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // Log theme-specific errors
    if (error.message?.includes('useTheme') || error.message?.includes('ThemeProvider')) {
      logger.error('Theme Provider Error:', { operation: 'ui.error' }, error instanceof Error ? error : new Error(String(error)));
    }
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Theme Error Boundary caught', {
      operation: 'ui.theme.error_boundary',
      error: error.message,
      componentStack: errorInfo.componentStack
    }, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-white">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Theme System Error</h1>
            <p className="mb-4 text-gray-600">
              There was a problem loading the theme system. The app will work in light mode.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => {
                  // Clear any theme-related localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('theme')
                    window.location.reload()
                  }
                }}
                variant="default"
              >
                Reset & Reload
              </Button>
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                variant="outline"
              >
                Continue Anyway
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-4 bg-gray-100 rounded text-left">
                <p className="text-xs font-mono text-red-600">{this.state.error.message}</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
