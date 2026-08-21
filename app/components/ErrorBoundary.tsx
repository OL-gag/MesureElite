'use client'

import { ReactNode, useState, useEffect } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Error caught:', event.error)
      setError(event.error)
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (error) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-4">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {error.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                setError(null)
                window.location.reload()
              }}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Try again or refresh the page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
