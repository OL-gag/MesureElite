'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useLanguage } from '@/app/lib/i18n/LanguageContext'

interface ErrorBoundaryProps {
  children: ReactNode
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const { t } = useLanguage()
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
              {t('errorBoundary.heading')}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {error.message || t('errorBoundary.genericMessage')}
            </p>
            <button
              onClick={() => {
                setError(null)
                window.location.reload()
              }}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              {t('errorBoundary.tryAgain')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
